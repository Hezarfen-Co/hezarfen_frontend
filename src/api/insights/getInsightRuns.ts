import { client, normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { InsightRun } from "../client";

/**
 * The run ledger, newest first. Manager+ only: `pending_students` names
 * people, and ZEKA's output contract confines that to the management view.
 */
export async function getInsightRuns(params?: PageParams, signal?: AbortSignal): Promise<Page<InsightRun>> {
  return normalizePage<InsightRun>(await client<unknown>(`/insights/runs${pageQuery(params)}`, { signal }));
}
