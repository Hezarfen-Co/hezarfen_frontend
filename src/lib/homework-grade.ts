import type { HomeworkRosterEntry } from "@/api/client";

/**
 * The status the grading panel opens with: the saved result, else "missing"
 * once the deadline passed with nothing handed in, else "done" only for a
 * student who did submit. A non-submitter before the deadline gets "" — the
 * grader has to choose, so one quick save never marks them as done.
 */
export function defaultGradeStatus(row: Pick<HomeworkRosterEntry, "result" | "missing" | "submission">): string {
  if (row.result?.status) return row.result.status;
  if (row.missing) return "missing";
  return row.submission ? "done" : "";
}
