import { client } from "../client";
import type { InsightPendingList } from "../client";

/**
 * The students the freshest compute run left pending — where the next run
 * starts. Manager+ only, like `getInsightRuns`; answered whole or refused
 * with 413, never clipped.
 */
export function getInsightsPending(signal?: AbortSignal): Promise<InsightPendingList> {
  return client<InsightPendingList>("/insights/pending", { signal });
}
