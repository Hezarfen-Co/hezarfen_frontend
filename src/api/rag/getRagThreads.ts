import { client, normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { RagThread } from "../client";

/** Sorted by `updated_at`, so the thread just written to is always first. */
export async function getRagThreads(params?: PageParams, signal?: AbortSignal): Promise<Page<RagThread>> {
  return normalizePage<RagThread>(await client<unknown>(`/rag/threads${pageQuery(params)}`, { signal }));
}
