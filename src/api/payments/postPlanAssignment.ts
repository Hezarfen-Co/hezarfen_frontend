import { client } from "../client";
import type { AssignmentOutcome } from "./types";

export function postPlanAssignment(
  planId: string,
  body: { student_ids: string[] },
): Promise<AssignmentOutcome[]> {
  return client<AssignmentOutcome[]>(
    `/payments/plans/${encodeURIComponent(planId)}/assignments`,
    { method: "POST", body },
  );
}
