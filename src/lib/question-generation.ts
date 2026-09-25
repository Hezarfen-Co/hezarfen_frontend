import { getClasses } from "@/api/classes";
import type { ClassGroup, Course } from "@/api/client";
import { getCourseById } from "@/api/courses";
import { getMyInstances } from "@/api/instances";
import { gradeLevelWireLabel } from "@/lib/grade-level";
import { FAN_OUT_LIMIT, mapConcurrent } from "@/lib/map-concurrent";

/** Pages one request may name; a wider range is almost always a typo. */
export const MAX_PAGES = 200;

/**
 * "3-7, 10" → [3, 4, 5, 6, 7, 10]. Null for anything that is not a list of
 * positive page numbers and ascending ranges, or that names more than
 * MAX_PAGES pages — the form says so instead of sending a guess.
 */
export function parsePages(input: string): number[] | null {
  const parts = input.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const pages = new Set<number>();
  for (const part of parts) {
    const range = /^(\d+)\s*-\s*(\d+)$/.exec(part);
    if (range) {
      const from = Number(range[1]);
      const to = Number(range[2]);
      if (from < 1 || to < from || to - from + 1 > MAX_PAGES) return null;
      for (let page = from; page <= to; page += 1) pages.add(page);
    } else if (/^\d+$/.test(part) && Number(part) >= 1) {
      pages.add(Number(part));
    } else {
      return null;
    }
    if (pages.size > MAX_PAGES) return null;
  }
  return [...pages].sort((a, b) => a - b);
}

/** One `(sinif, ders)` pair a teacher may generate over, with the catalog course behind it. */
export type StudyScopeOption = {
  key: string;
  ders: string;
  /** The şube grade; null for a school-wide club/etüt corpus. */
  sinif: string | null;
  course: Course;
  label: string;
};

/**
 * The backend derives a caller's RAG scope from their own sections' instances
 * — `ders` is the catalog course, `sinif` the şube's grade — and refuses any
 * other pair, so the picker offers exactly those. Several şubeler of the same
 * grade and course collapse into one pair.
 */
export async function loadStudyScopes(): Promise<StudyScopeOption[]> {
  const [instances, classes] = await Promise.all([
    getMyInstances({ limit: 200 }),
    getClasses({ limit: 200 }).catch(() => ({ items: [] as ClassGroup[] })),
  ]);
  const gradeOf = new Map(classes.items.map((klass) => [klass.id, gradeLevelWireLabel(klass.grade_level)]));
  const courseIds = [...new Set(instances.items.map((instance) => instance.course))];
  const courses = await mapConcurrent(courseIds, FAN_OUT_LIMIT, (id) => getCourseById(id).catch(() => null));
  const courseById = new Map(courses.filter((course): course is Course => course !== null).map((course) => [course.id, course]));

  const options = new Map<string, StudyScopeOption>();
  for (const instance of instances.items) {
    const course = courseById.get(instance.course);
    if (!course) continue;
    const sinif = course.kind === "course" ? gradeOf.get(instance.class) ?? null : null;
    // The backend names a section's pair by its resolved title, not the catalog's.
    const ders = instance.title || course.title;
    const key = `${ders}\u0000${sinif ?? ""}`;
    if (!options.has(key)) {
      options.set(key, { key, ders, sinif, course, label: sinif ? `${ders} · ${sinif}` : ders });
    }
  }
  return [...options.values()].sort((a, b) => a.label.localeCompare(b.label, "tr"));
}
