import { client } from "../client";
import type { BlueprintResult } from "../client";

// `course_ids` is the whole set, not a delta: a course dropped from it is
// detached from every class at this grade that the blueprint attached it to.
// Hand-attached courses are never touched.
export type UpdateBlueprintBody = { course_ids: string[] };

// A 409 means the blueprint changed since it was read — there is no version to
// echo back, so re-read it and let the user resubmit from the fresh list.
export function patchClassBlueprintByGrade(
  grade: string,
  body: UpdateBlueprintBody,
): Promise<BlueprintResult> {
  return client<BlueprintResult>(`/classes/blueprints/${encodeURIComponent(grade)}`, {
    method: "PATCH",
    body,
  });
}
