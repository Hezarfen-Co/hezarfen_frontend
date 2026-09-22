import { createEffect, createSignal, onCleanup } from "solid-js";
import { getClassById, getMyClasses } from "@/api/classes";
import { getCourseById } from "@/api/courses";
import { getInstanceById } from "@/api/instances";
import type { Role } from "@/api/client";
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
 * - `GET /instances/{id}` for the course and class ids,
 * - `GET /courses/{id}` for the catalog title,
 * - the class name: `GET /classes/{id}` for teacher+ (that route is teacher+
 *   only), `GET /classes/me` once for anyone else.
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
const courseCache = new Map<string, Promise<string | null>>();
const classCache = new Map<string, Promise<string | null>>();
let myClassesCache: Promise<Map<string, string>> | null = null;

function courseTitle(id: string): Promise<string | null> {
  let hit = courseCache.get(id);
  if (!hit) {
    hit = getCourseById(id).then(
      (course) => course.title,
      () => {
        courseCache.delete(id);
        return null;
      },
    );
    courseCache.set(id, hit);
  }
  return hit;
}

function className(id: string, role: Role | undefined): Promise<string | null> {
  if (hasMinRole(role, "teacher")) {
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
  if (!myClassesCache) {
    myClassesCache = getMyClasses().then(
      (page) => new Map(page.items.map((klass) => [klass.id, klass.name])),
      () => new Map<string, string>(),
    );
  }
  return myClassesCache.then((names) => names.get(id) ?? null);
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
        const [title, klass] = await Promise.all([courseTitle(instance.course), className(instance.class, role)]);
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
  courseCache.clear();
  classCache.clear();
  myClassesCache = null;
}
