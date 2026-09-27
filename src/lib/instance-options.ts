import { getClasses, getMyClasses } from "@/api/classes";
import { getMyInstances } from "@/api/instances";
import type { ClassGroup, Role } from "@/api/client";
import { hasMinRole } from "@/lib/roles";
import { loadSchoolSections } from "@/lib/instance-labels";
import { compareClasses } from "@/lib/student-directory";

/** One pickable section: "<ders> — <şube>", plus the ids behind the label. */
export type InstanceOption = {
  id: string;
  /** The catalog course it teaches — what subjects and question banks key on. */
  course: string;
  class: string;
  label: string;
};

/**
 * The sections a user may act in, labelled for a picker.
 *
 * There is no course-scoped instance route, so the office walks the class list
 * (one read per class) while everyone else reads the single `/instances/me`
 * that already answers "which sections are mine".
 */
export async function loadInstanceOptions(role: Role | undefined): Promise<InstanceOption[]> {
  if (!role) return [];
  const office = hasMinRole(role, "manager");

  // Each section carries its resolved display title, so no per-course read.
  const rows: { id: string; course: string; class: string; title: string }[] = [];
  const classesById = new Map<string, ClassGroup>();

  if (office) {
    // Shared with the label cache: the school is walked once per tab. One
    // unreadable şube comes back empty instead of emptying the picker.
    for (const { klass, sections } of await loadSchoolSections()) {
      classesById.set(klass.id, klass);
      for (const instance of sections) {
        rows.push({ id: instance.id, course: instance.course, class: instance.class, title: instance.title });
      }
    }
  } else {
    const [mine, classes] = await Promise.all([
      getMyInstances({ limit: 200 }),
      (hasMinRole(role, "teacher") ? getClasses({ limit: 200 }) : getMyClasses({ limit: 200 })).catch(
        () => ({ items: [] as ClassGroup[] }),
      ),
    ]);
    for (const klass of classes.items) classesById.set(klass.id, klass);
    for (const instance of mine.items) {
      rows.push({ id: instance.id, course: instance.course, class: instance.class, title: instance.title });
    }
  }


  // Class by class (9-A, 9-B, 10-A…), then by ders inside a class, the order a
  // school reads its timetable in; a şube this caller cannot name goes last.
  const collator = new Intl.Collator("tr", { numeric: true, sensitivity: "base" });
  const courseTitle = (row: { title: string }) => row.title?.trim() || "—";
  return rows
    .sort((a, b) => {
      const classA = classesById.get(a.class);
      const classB = classesById.get(b.class);
      if (classA && !classB) return -1;
      if (!classA && classB) return 1;
      if (classA && classB) {
        const byClass = compareClasses(classA, classB);
        if (byClass !== 0) return byClass;
      }
      return collator.compare(courseTitle(a), courseTitle(b));
    })
    .map((row) => ({
      id: row.id,
      course: row.course,
      class: row.class,
      label: `${courseTitle(row)} — ${classesById.get(row.class)?.name ?? "—"}`,
    }));
}
