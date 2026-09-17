import { client } from "../client";

/** The receipt for an accepted recompute. Nothing is computed yet. */
export type AcceptedInsightRun = {
  message_id: string;
  status: "pending";
};

export type PostInsightsRefreshBody = {
  /**
   * Student user ids to recompute; omit for the service's own configured list
   * — the backend does not enumerate a school roster for it.
   */
  user_ids?: string[];
  /** Recompute even where the service considers its cached result valid. */
  force?: boolean;
};

/**
 * 202 — a school-wide batch, queued. The sweep's own record is the run ledger,
 * so poll `getInsightRuns` to watch a run move from `running` to its verdict.
 * Manager+ only, and 503 when no service offers `insight.refresh`.
 */
export function postInsightsRefresh(body: PostInsightsRefreshBody = {}): Promise<AcceptedInsightRun> {
  return client<AcceptedInsightRun>("/insights/refresh", { method: "POST", body });
}
