import type { MessageKey } from "@/i18n/messages";

// A blueprint's `skipped[]` rows carry the backend's own English prose. Raw
// backend text is never shown to a user anywhere else in this app, so it is
// not shown here either: each sentence maps to a localized key, and anything
// unmapped falls back to a generic line rather than leaking English.
//
// Normalization mirrors client.ts's normalizeApiMessage, so a change in
// punctuation or casing on the backend does not silently drop a mapping.
function normalize(reason: string): string {
  return reason
    .trim()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/, "")
    .toLowerCase();
}

const FIXED_REASONS: Record<string, MessageKey> = {
  "the class was deleted while the blueprint was being applied": "classBlueprints.skipClassGone",
  "this course no longer exists — it has been dropped from the blueprint": "classBlueprints.skipCoursePruned",
  "this course no longer exists - it has been dropped from the blueprint": "classBlueprints.skipCoursePruned",
  "the class is already at its course ceiling": "classBlueprints.skipCeiling",
  "the class holds more students than a course attach is allowed to enroll at once":
    "classBlueprints.skipOverloaded",
};

// The two remaining reasons name the course, so they carry a parameter.
const NO_SEAT = /^(.+) has no free seat for the whole class$/;
const COURSE_GONE = /^(.+) no longer exists [—-] detach it from this class first$/;

export type SkipCopy = { key: MessageKey; vars?: Record<string, string> };

/**
 * `courseTitle` resolves the row's course id to a title; the backend's own
 * rendering of the course is discarded so the two locales read the same.
 */
export function skipReasonCopy(reason: string, courseTitle: string): SkipCopy {
  const normalized = normalize(reason);

  const fixed = FIXED_REASONS[normalized];
  if (fixed) return { key: fixed };

  if (NO_SEAT.test(normalized)) return { key: "classBlueprints.skipNoSeat", vars: { course: courseTitle } };
  if (COURSE_GONE.test(normalized)) {
    return { key: "classBlueprints.skipCourseGone", vars: { course: courseTitle } };
  }

  return { key: "classBlueprints.skipOther" };
}
