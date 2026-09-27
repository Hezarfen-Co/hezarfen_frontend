import { getClassMembers } from "@/api/classes";
import { getUserSearch } from "@/api/users";
import type { ClassGroup, ClassMember, PersonRef } from "@/api/client";
import { FAN_OUT_LIMIT, mapConcurrent } from "@/lib/map-concurrent";
import { classList } from "@/lib/instance-labels";

export type StudentDirectoryRow = {
  person: PersonRef;
  classes: ClassGroup[];
};

/** Page size for the class-roster reads; the same one the full sweep asks for. */
const MEMBERS_PAGE = 500;
const FRESH_MS = 5 * 60 * 1000;
const memberCache = new Map<string, { until: number; value: Promise<ClassMember[]> }>();
const countCache = new Map<string, { until: number; value: Promise<number> }>();
let studentsCache: { until: number; value: Promise<PersonRef[]> } | null = null;

export function invalidateStudentDirectory(): void {
  memberCache.clear();
  countCache.clear();
  studentsCache = null;
}

/** Every live member of one class: the route is paged, so follow offsets to `total`. */
async function fetchClassMembers(classId: string): Promise<ClassMember[]> {
  const members: ClassMember[] = [];
  let offset = 0;
  for (;;) {
    const page = await getClassMembers(classId, { limit: MEMBERS_PAGE, offset });
    members.push(...page.items);
    offset += page.items.length;
    if (page.items.length === 0 || offset >= page.total) return members;
  }
}

export function readClassMembers(classId: string): Promise<ClassMember[]> {
  const hit = memberCache.get(classId);
  if (hit && hit.until > Date.now()) return hit.value;
  const entry = { until: Date.now() + FRESH_MS, value: fetchClassMembers(classId) };
  memberCache.set(classId, entry);
  void entry.value.then((members) => {
    if (memberCache.get(classId) === entry) countCache.set(classId, { until: entry.until, value: Promise.resolve(members.length) });
  }, () => {
    if (memberCache.get(classId) === entry) memberCache.delete(classId);
  });
  return entry.value;
}

export function classMemberCount(classId: string): Promise<number> {
  const roster = memberCache.get(classId);
  if (roster && roster.until > Date.now()) return roster.value.then((members) => members.length);
  const hit = countCache.get(classId);
  if (hit && hit.until > Date.now()) return hit.value;
  const entry = { until: Date.now() + FRESH_MS, value: getClassMembers(classId, { limit: 1 }).then((page) => page.total) };
  countCache.set(classId, entry);
  void entry.value.catch(() => {
    if (countCache.get(classId) === entry) countCache.delete(classId);
  });
  return entry.value;
}

function students(): Promise<PersonRef[]> {
  if (studentsCache && studentsCache.until > Date.now()) return studentsCache.value;
  const entry = { until: Date.now() + FRESH_MS, value: getUserSearch("", undefined, "student").then((page) => page.items) };
  studentsCache = entry;
  void entry.value.catch(() => { if (studentsCache === entry) studentsCache = null; });
  return entry.value;
}

/**
 * Shared student list for teacher-facing reports: one name column and the classes it belongs to.
 * With `cls` the read is scoped to that class: only its roster is fetched, and
 * each row's `classes` is just that class. Without it every student and every
 * class's members are read, as before.
 */
export async function getStudentDirectory(cls?: ClassGroup): Promise<StudentDirectoryRow[]> {
  if (cls) return sortByClass((await readClassMembers(cls.id)).map((member) => ({ person: member.user, classes: [cls] })));
  const [people, classes] = await Promise.all([students(), classList()]);
  const byStudent = new Map<string, ClassGroup[]>();
  const memberships = await mapConcurrent(classes, FAN_OUT_LIMIT, async (cls) => ({
    cls, members: await readClassMembers(cls.id).catch(() => [] as ClassMember[]),
  }));
  for (const { cls, members } of memberships) {
    for (const member of members) {
      byStudent.set(member.user.id, [...(byStudent.get(member.user.id) ?? []), cls]);
    }
  }
  return sortByClass(people.map((person) => ({ person, classes: byStudent.get(person.id) ?? [] })));
}

const collator = new Intl.Collator("tr", { numeric: true, sensitivity: "base" });

/** Class order a school reads rosters in: grade (9 before 10), then the şube name. */
export function compareClasses(a: ClassGroup, b: ClassGroup): number {
  if (a.grade_level !== b.grade_level) return a.grade_level - b.grade_level;
  return collator.compare(a.name, b.name);
}

/**
 * Rows ordered class by class (9-A, 9-B, 10-A…) and by name inside a class.
 * A student in several classes files under the first of them; students with
 * no class come last. The row's own `classes` are put in the same order.
 */
export function sortByClass<Row extends { person: PersonRef; classes: ClassGroup[] }>(rows: Row[]): Row[] {
  const ordered = rows.map((row) => ({ ...row, classes: [...row.classes].sort(compareClasses) }));
  return ordered.sort((a, b) => {
    const classA = a.classes[0];
    const classB = b.classes[0];
    if (classA && !classB) return -1;
    if (!classA && classB) return 1;
    if (classA && classB) {
      const byClass = compareClasses(classA, classB);
      if (byClass !== 0) return byClass;
    }
    return collator.compare(a.person.display_name || a.person.username, b.person.display_name || b.person.username);
  });
}
