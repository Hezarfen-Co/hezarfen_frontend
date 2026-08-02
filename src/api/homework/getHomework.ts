import { client } from "../client";
import { appendPageParams, normalizePage, type Page, type PageParams } from "../client";
import type { Homework } from "../client";

export type HomeworkListParams = PageParams & { due_after?: number };

export async function getHomework(params?: HomeworkListParams, signal?: AbortSignal): Promise<Page<Homework>> {
  const query = new URLSearchParams();
  appendPageParams(query, params);
  if (params?.due_after != null) query.set("due_after", String(params.due_after));
  const suffix = query.size ? `?${query}` : "";
  const data = await client<unknown>(`/homework${suffix}`, { signal });
  return normalizePage<Homework>(data);
}
