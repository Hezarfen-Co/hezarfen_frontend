import { client } from "../client";
import type { AcceptedInsightRun } from "./postInsightsRefresh";

export type PostInsightComputeBody = {
  /** Compute only these sections; omit for all of them. */
  sections?: string[];
  /** ISO-8601 date to compute from; omit for the dönem's beginning. */
  since?: string;
};

/**
 * 202 — queued, not computed. The service works through the student's data on
 * its own; poll `getInsightByUserId` and watch `summary.computed_at` move.
 * 503 when no service offers `insight.student`, and then nothing was queued.
 * Authorization is `getInsightByUserId`'s gate for gate, so a refusal is a 404.
 */
export function postInsightComputeByUserId(
  userId: string,
  body: PostInsightComputeBody = {},
): Promise<AcceptedInsightRun> {
  return client<AcceptedInsightRun>(`/insights/students/${encodeURIComponent(userId)}`, {
    method: "POST",
    body,
  });
}
