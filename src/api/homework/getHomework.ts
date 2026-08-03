import { client } from "../client";
import { appendPageParams, normalizePage, type Page, type PageParams } from "../client";
import type { Homework } from "../client";

/**
 * `GET /homework` takes `limit`/`offset` only — unlike events and exams it has
 * no schedule window, so a due-date filter has to happen in the caller.
 */
export type HomeworkListParams = PageParams;

export async function getHomework(params?: HomeworkListParams, signal?: AbortSignal): Promise<Page<Homework>> {
  const query = new URLSearchParams();
  appendPageParams(query, params);
  const suffix = query.size ? `?${query}` : "";
  const data = await client<unknown>(`/homework${suffix}`, { signal });
  return normalizePage<Homework>(data);
}
