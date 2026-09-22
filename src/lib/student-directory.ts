import { getClassMembers, getClasses } from "@/api/classes";
import { getUserSearch } from "@/api/users";
import type { ClassGroup, PersonRef } from "@/api/client";

export type StudentDirectoryRow = {
  person: PersonRef;
  classes: ClassGroup[];
};

/** Shared student list for teacher-facing reports: one name column and the classes it belongs to. */
export async function getStudentDirectory(): Promise<StudentDirectoryRow[]> {
  const [students, classes] = await Promise.all([
    getUserSearch("", undefined, "student"),
    getClasses({ limit: 200 }),
  ]);
  const byStudent = new Map<string, ClassGroup[]>();
  const memberships = await Promise.all(
    classes.items.map(async (cls) => ({ cls, members: (await getClassMembers(cls.id, { limit: 500 })).items })),
  );
  for (const { cls, members } of memberships) {
    for (const member of members) {
      byStudent.set(member.user.id, [...(byStudent.get(member.user.id) ?? []), cls]);
    }
  }
  return sortByClass(students.items.map((person) => ({ person, classes: byStudent.get(person.id) ?? [] })));
}

const collator = new Intl.Collator("tr", { numeric: true, sensitivity: "base" });

/** Class order a school reads rosters in: grade (9 before 10), then the şube name. */
export function compareClasses(a: ClassGroup, b: ClassGroup): number {
  const gradeA = Number.parseInt(a.grade ?? a.name, 10);
  const gradeB = Number.parseInt(b.grade ?? b.name, 10);
  if (Number.isFinite(gradeA) && Number.isFinite(gradeB) && gradeA !== gradeB) return gradeA - gradeB;
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
