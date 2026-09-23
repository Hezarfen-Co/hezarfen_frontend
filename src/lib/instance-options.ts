import { getClasses, getClassInstances, getMyClasses } from "@/api/classes";
import { getCourseById } from "@/api/courses";
import { getMyInstances } from "@/api/instances";
import type { ClassGroup, Role } from "@/api/client";
import { hasMinRole } from "@/lib/roles";
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

  const rows: { id: string; course: string; class: string }[] = [];
  const classesById = new Map<string, ClassGroup>();

  if (office) {
    const classes = (await getClasses({ limit: 200 })).items;
    const perClass = await Promise.all(
      classes.map(async (klass) => {
        classesById.set(klass.id, klass);
        try {
          return (await getClassInstances(klass.id, { limit: 200 })).items;
        } catch {
          // One unreadable şube must not empty the whole picker.
          return [];
        }
      }),
    );
    for (const instance of perClass.flat()) {
      rows.push({ id: instance.id, course: instance.course, class: instance.class });
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
      rows.push({ id: instance.id, course: instance.course, class: instance.class });
    }
  }

  const titles = new Map<string, string>();
  await Promise.all(
    [...new Set(rows.map((row) => row.course))].map(async (courseId) => {
      try {
        titles.set(courseId, (await getCourseById(courseId)).title);
      } catch {
        // Shows as a dash in the label below, never the raw id.
      }
    }),
  );

  // Class by class (9-A, 9-B, 10-A…), then by ders inside a class, the order a
  // school reads its timetable in; a şube this caller cannot name goes last.
  const collator = new Intl.Collator("tr", { numeric: true, sensitivity: "base" });
  const courseTitle = (row: { course: string }) => titles.get(row.course) ?? "—";
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
      ...row,
      label: `${courseTitle(row)} — ${classesById.get(row.class)?.name ?? "—"}`,
    }));
}
