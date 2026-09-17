import { client, normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { RagMessage } from "../client";

export async function getRagThreadMessages(
  threadId: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<RagMessage>> {
  const url = `/rag/threads/${encodeURIComponent(threadId)}/messages${pageQuery(params)}`;
  return normalizePage<RagMessage>(await client<unknown>(url, { signal }));
}
