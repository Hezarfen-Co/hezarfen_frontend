import { createEffect, createSignal, onCleanup } from "solid-js";
import { getClassesByUserId } from "@/api/classes";

/**
 * Class labels for people shown in a search result. `/users/search` returns
 * only id/username/display name, so "which class is this student in?" — the
 * question that tells two students with the same name apart — needs a second
 * read per student (`GET /classes/user/{id}`, teacher+).
 *
 * Only call this for a list that is already bounded (a picker's visible
 * results, a palette page), and only for students: a caller below teacher
 * gets a 403, which is swallowed here as "no label".
 *
 * Answers are cached for the lifetime of the tab. Class membership does not
 * move during a session, and without the cache every keystroke-driven result
 * list would re-ask for people it just looked up.
 */
const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

const MAX_CLASSES_PER_STUDENT = 3;

function load(userId: string): Promise<string> {
  const cached = cache.get(userId);
  if (cached !== undefined) return Promise.resolve(cached);
  const running = inflight.get(userId);
  if (running) return running;
  const request = getClassesByUserId(userId, { limit: MAX_CLASSES_PER_STUDENT })
    .then((page) => page.items.map((group) => group.name).join(", "))
    // A 403/404 (no permission, no such membership) is not an error to show —
    // the row simply carries no class.
    .catch(() => "")
    .then((label) => {
      cache.set(userId, label);
      inflight.delete(userId);
      return label;
    });
  inflight.set(userId, request);
  return request;
}

/** Reactive `id -> class name` map that fills in as the lookups land. */
export function createStudentClassLabels(userIds: () => string[]) {
  const [labels, setLabels] = createSignal<Record<string, string>>({});
  createEffect(() => {
    let disposed = false;
    onCleanup(() => {
      disposed = true;
    });
    for (const id of userIds()) {
      void load(id).then((label) => {
        if (disposed || !label) return;
        setLabels((prev) => (prev[id] === label ? prev : { ...prev, [id]: label }));
      });
    }
  });
  return labels;
}
