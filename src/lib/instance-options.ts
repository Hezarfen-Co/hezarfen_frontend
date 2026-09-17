import { getClasses, getClassInstances, getMyClasses } from "@/api/classes";
import { getCourseById } from "@/api/courses";
import { getMyInstances } from "@/api/instances";
import type { ClassGroup, Role } from "@/api/client";
import { hasMinRole } from "@/lib/roles";

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
  const classNames = new Map<string, string>();

  if (office) {
    const classes = (await getClasses({ limit: 200 })).items;
    const perClass = await Promise.all(
      classes.map(async (klass) => {
        classNames.set(klass.id, klass.name);
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
    for (const klass of classes.items) classNames.set(klass.id, klass.name);
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
        // Falls back to the id in the label below.
      }
    }),
  );

  return rows.map((row) => ({
    ...row,
    label: `${titles.get(row.course) ?? row.course} — ${classNames.get(row.class) ?? "—"}`,
  }));
}
