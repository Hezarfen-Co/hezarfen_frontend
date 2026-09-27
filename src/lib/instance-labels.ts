import { createEffect, createSignal, onCleanup } from "solid-js";
import { getClassById, getClassInstances, getClasses, getMyClasses } from "@/api/classes";
import { getInstanceById } from "@/api/instances";
import type { ClassCourse, ClassGroup, Role } from "@/api/client";
import { FAN_OUT_LIMIT, mapConcurrent } from "@/lib/map-concurrent";
import { hasMinRole } from "@/lib/roles";

/**
 * "<ders> — <şube>" for a şube×ders instance.
 *
 * Exams and homework name an instance (`class_course`), never a course. The
 * same ders taught in two şubeler therefore produces rows with the same title,
 * and only the şube tells them apart — so every surface listing them labels a
 * row through here instead of showing the catalog title alone.
 *
 * Reads, all cached for the tab (a section never changes its course or class):
 * - `GET /instances/{id}`: ids plus the resolved display `title` (override,
 *   else offering, else catalog), so no per-course read is needed;
 * - the class name: one `GET /classes` list for teacher+, `GET /classes/me`
 *   once for anyone else; a class missing from the list falls back to
 *   `GET /classes/{id}`.
 * A read the caller may not make just leaves that part out of the label.
 */
export type InstanceLabel = {
  course: string;
  class: string;
  courseTitle: string | null;
  className: string | null;
  label: string;
};

const instanceCache = new Map<string, Promise<InstanceLabel | null>>();
const classCache = new Map<string, Promise<string | null>>();
let myClassesCache: Promise<Map<string, string>> | null = null;
let allClassesCache: Promise<Map<string, string>> | null = null;
let classListCache: Promise<ClassGroup[]> | null = null;
let schoolSectionsCache: Promise<{ klass: ClassGroup; sections: ClassCourse[] }[]> | null = null;
let schoolIndexCache: Promise<boolean> | null = null;

/** Teacher+: the school's class list, read once per tab. */
export function classList(): Promise<ClassGroup[]> {
  if (!classListCache) {
    classListCache = getClasses({ limit: 200 }).then(
      (page) => page.items,
      () => {
        classListCache = null;
        return [];
      },
    );
  }
  return classListCache;
}

/**
 * Teacher+: every section of the school, class by class (there is no
 * school-wide section route), read once per tab and shared by the label
 * cache and the section pickers. A class that cannot be read comes back empty.
 */
export function loadSchoolSections(): Promise<{ klass: ClassGroup; sections: ClassCourse[] }[]> {
  if (!schoolSectionsCache) {
    schoolSectionsCache = classList().then((classes) =>
      mapConcurrent(classes, FAN_OUT_LIMIT, (klass) =>
        getClassInstances(klass.id, { limit: 200 }).then(
          (page) => ({ klass, sections: page.items }),
          () => ({ klass, sections: [] as ClassCourse[] }),
        ),
      ),
    ).catch(() => {
      schoolSectionsCache = null;
      return [];
    });
  }
  return schoolSectionsCache;
}

/**
 * Teacher+ only: read every section of the school through the class list —
 * one request per class — and seed the label cache with all of them. Used
 * when a page needs more labels than there are classes (a dashboard or a
 * calendar full of homework), where it replaces one read per section.
 */
function seedSchoolIndex(role: Role | undefined): Promise<boolean> {
  if (!schoolIndexCache) {
    schoolIndexCache = loadSchoolSections().then((pages) => {
      if (pages.length === 0) return false;
      for (const entry of pages) {
        for (const instance of entry.sections) {
          const title = instance.title?.trim() || null;
          const label = formatInstanceLabel(title, entry.klass.name);
          if (!label) continue;
          instanceCache.set(`${role ?? ""}:${instance.id}`, Promise.resolve({
            course: instance.course,
            class: instance.class,
            courseTitle: title,
            className: entry.klass.name,
            label,
          }));
        }
      }
      return true;
    }).catch(() => {
      schoolIndexCache = null;
      return false;
    });
  }
  return schoolIndexCache;
}

function className(id: string, role: Role | undefined): Promise<string | null> {
  if (hasMinRole(role, "teacher")) {
    if (!allClassesCache) {
      allClassesCache = classList().then((classes) => new Map(classes.map((klass) => [klass.id, klass.name])));
    }
    return allClassesCache.then((names) => names.get(id) ?? classById(id));
  }
  if (!myClassesCache) {
    myClassesCache = getMyClasses().then(
      (page) => new Map(page.items.map((klass) => [klass.id, klass.name])),
      () => new Map<string, string>(),
    );
  }
  return myClassesCache.then((names) => names.get(id) ?? null);
}

function classById(id: string): Promise<string | null> {
  {
    let hit = classCache.get(id);
    if (!hit) {
      hit = getClassById(id).then(
        (klass) => klass.name,
        () => {
          classCache.delete(id);
          return null;
        },
      );
      classCache.set(id, hit);
    }
    return hit;
  }
}

/** Joins a course title and a class name; either may be missing. */
export function formatInstanceLabel(courseTitle: string | null, className: string | null): string {
  if (courseTitle && className) return `${courseTitle} — ${className}`;
  return courseTitle ?? className ?? "";
}

export function loadInstanceLabel(id: string, role: Role | undefined): Promise<InstanceLabel | null> {
  const key = `${role ?? ""}:${id}`;
  let hit = instanceCache.get(key);
  if (!hit) {
    hit = Promise.resolve()
      .then(() => getInstanceById(id))
      .then(async (instance) => {
        const title = instance.title?.trim() || null;
        const klass = await className(instance.class, role);
        // A part that failed to load (a rate limit, a blip) is not kept, so
        // the next list asks again instead of showing a half label all session.
        if (title == null || klass == null) instanceCache.delete(key);
        const label = formatInstanceLabel(title, klass);
        return label ? { course: instance.course, class: instance.class, courseTitle: title, className: klass, label } : null;
      })
      .catch(() => {
        // A failed read is not remembered, so a later list can try again.
        instanceCache.delete(key);
        return null;
      });
    instanceCache.set(key, hit);
  }
  return hit;
}

/** Labels for a bounded set of instance ids, fetched a few at a time. */
export async function loadInstanceLabels(ids: readonly string[], role: Role | undefined): Promise<Map<string, InstanceLabel>> {
  const unique = [...new Set(ids)];
  // Many labels at once: reading the school's sections class by class is
  // cheaper than one read per section, once they outnumber the classes.
  if (hasMinRole(role, "teacher")) {
    const uncached = unique.filter((id) => !instanceCache.has(`${role ?? ""}:${id}`));
    if (uncached.length > 0) {
      const classes = await classList();
      if (classes.length > 0 && uncached.length > classes.length) await seedSchoolIndex(role);
    }
  }
  const labels = await mapConcurrent(unique, FAN_OUT_LIMIT, (id) => loadInstanceLabel(id, role));
  const out = new Map<string, InstanceLabel>();
  unique.forEach((id, index) => {
    const label = labels[index];
    if (label) out.set(id, label);
  });
  return out;
}

/** Reactive `instance id -> label` record that fills in as the reads land. */
export function createInstanceLabels(ids: () => readonly string[], role: () => Role | undefined) {
  const [labels, setLabels] = createSignal<Record<string, InstanceLabel>>({});
  createEffect(() => {
    const wanted = [...new Set(ids())];
    const currentRole = role();
    let disposed = false;
    onCleanup(() => {
      disposed = true;
    });
    if (!currentRole || wanted.length === 0) return;
    void loadInstanceLabels(wanted, currentRole).catch(() => new Map<string, InstanceLabel>()).then((found) => {
      if (disposed || found.size === 0) return;
      setLabels((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [id, entry] of found) {
          if (next[id]?.label !== entry.label) {
            next[id] = entry;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    });
  });
  return labels;
}

/** Test hook: forget every cached read. */
export function resetInstanceLabelCache(): void {
  instanceCache.clear();
  classCache.clear();
  myClassesCache = null;
  allClassesCache = null;
  classListCache = null;
  schoolSectionsCache = null;
  schoolIndexCache = null;
}
