import { client } from "../client";
import type { RolloverResult } from "../client";

/**
 * Carries `from_year`'s şubeler into this year — same names, promoted grades,
 * copies of their instances and live members. The target must be empty, open,
 * and a different year; a second rollover is a 409, which is what makes the
 * command idempotent.
 */
export function postAcademicYearRollover(id: string, fromYear: string): Promise<RolloverResult> {
  return client<RolloverResult>(`/academic-years/${id}/rollover`, {
    method: "POST",
    body: { from_year: fromYear },
  });
}
