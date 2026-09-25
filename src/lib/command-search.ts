import { getCourses } from "@/api/courses";
import { getExams } from "@/api/exams";
import { getEvents } from "@/api/events";
import { getHomework } from "@/api/homework";
import { getMyInstances } from "@/api/instances";
import type { Role } from "@/api/client";
import { LIST_CAP, loadCappedList } from "@/lib/capped-list";
import { loadInstanceLabels } from "@/lib/instance-labels";
import { matchesSearch } from "@/lib/search-text";

/**
 * Records the command palette can search besides pages and actions: the
 * courses, exams, homework and events the user's own list pages show.
 *
 * Each kind is read the way its list page reads it (same endpoint, same cap,
 * same role scoping), once when the palette opens — never per keystroke — and
 * the typed query is matched client-side with the app's Turkish folding.
 */
export type CommandRecordKind = "course" | "exam" | "homework" | "event";

export const COMMAND_RECORD_KINDS: readonly CommandRecordKind[] = ["course", "exam", "homework", "event"];

/** The list route each kind lives under; a kind is searched only when its route is in the user's nav. */
export const COMMAND_RECORD_ROUTES: Record<CommandRecordKind, string> = {
  course: "/courses",
  exam: "/exams",
  homework: "/homework",
  event: "/events",
};

export type CommandRecord = {
  kind: CommandRecordKind;
  id: string;
  title: string;
  /** "<ders> — <şube>" for exams and homework; null when it could not be read. */
  context: string | null;
  description: string | null;
  /** Course kind (course / study / club) for catalog rows. */
  courseKind?: string;
  /** Start time (exam, event) or due time (homework). */
  at: number | null;
};

/** Below this many characters a query would match nearly every record. */
export const COMMAND_RECORD_MIN_QUERY = 2;
export const COMMAND_RECORDS_PER_KIND = 5;

/**
 * Records matching `query`, in kind order, at most `perKind` of each — the
 * palette is a jump list, not a results page, and the list page holds the rest.
 */
export function filterCommandRecords(
  records: readonly CommandRecord[],
  query: string,
  perKind = COMMAND_RECORDS_PER_KIND,
): CommandRecord[] {
  const q = query.trim();
  if (q.length < COMMAND_RECORD_MIN_QUERY) return [];
  const counts = new Map<CommandRecordKind, number>();
  const out: CommandRecord[] = [];
  for (const kind of COMMAND_RECORD_KINDS) {
    for (const record of records) {
      if (record.kind !== kind) continue;
      if ((counts.get(kind) ?? 0) >= perKind) break;
      if (!matchesSearch(q, record.title, record.context, record.description)) continue;
      counts.set(kind, (counts.get(kind) ?? 0) + 1);
      out.push(record);
    }
  }
  return out;
}

async function loadCourses(): Promise<CommandRecord[]> {
  // GET /courses is already scoped: a student's list is their own enrolments.
  const page = await getCourses();
  return page.items.map((course) => ({
    kind: "course",
    id: course.id,
    title: course.title,
    context: null,
    description: course.description || null,
    courseKind: course.kind,
    at: null,
  }));
}

async function loadExams(role: Role): Promise<CommandRecord[]> {
  const [page, mine] = await Promise.all([
    loadCappedList(getExams, LIST_CAP, false),
    // As on /exams: a student only sees exams set in their own sections.
    role === "student" ? getMyInstances({ limit: 200 }).then((p) => new Set(p.items.map((i) => i.id))) : null,
  ]);
  const items = mine ? page.items.filter((exam) => mine.has(exam.class_course)) : page.items;
  const labels = await loadInstanceLabels(items.map((exam) => exam.class_course), role).catch(() => new Map());
  return items.map((exam) => ({
    kind: "exam",
    id: exam.id,
    title: exam.title,
    context: labels.get(exam.class_course)?.label ?? null,
    description: exam.description || null,
    at: exam.starts_at,
  }));
}

async function loadHomework(role: Role): Promise<CommandRecord[]> {
  const items = (await getHomework({ limit: LIST_CAP })).items;
  const labels = await loadInstanceLabels(items.map((item) => item.class_course), role).catch(() => new Map());
  return items.map((item) => ({
    kind: "homework",
    id: item.id,
    title: item.title,
    context: labels.get(item.class_course)?.label ?? null,
    description: item.description || null,
    at: item.due_at,
  }));
}

async function loadEvents(): Promise<CommandRecord[]> {
  const page = await loadCappedList(getEvents, LIST_CAP, false);
  return page.items.map((event) => ({
    kind: "event",
    id: event.id,
    title: event.title,
    context: null,
    description: event.description || null,
    at: event.starts_at,
  }));
}

const LOADERS: Record<CommandRecordKind, (role: Role) => Promise<CommandRecord[]>> = {
  course: loadCourses,
  exam: loadExams,
  homework: loadHomework,
  event: loadEvents,
};

/** Reopening the palette within this window reuses the last read. */
const CACHE_MS = 60_000;
let cache: { key: string; at: number; records: Promise<CommandRecord[]> } | null = null;

/**
 * Every searchable record for `role`, limited to `kinds`. A kind that fails to
 * load is left out rather than emptying the others.
 */
export function loadCommandRecords(
  role: Role,
  kinds: readonly CommandRecordKind[],
  now: number = Date.now(),
): Promise<CommandRecord[]> {
  const key = `${role}|${[...kinds].sort().join(",")}`;
  if (cache && cache.key === key && now - cache.at < CACHE_MS) return cache.records;
  const records = Promise.allSettled(kinds.map((kind) => LOADERS[kind](role))).then((results) =>
    results.flatMap((result) => (result.status === "fulfilled" ? result.value : [])),
  );
  cache = { key, at: now, records };
  return records;
}

/** Test hook: forget the last read. */
export function resetCommandRecordCache(): void {
  cache = null;
}
