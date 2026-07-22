import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { Homework } from "../client";

export async function getHomework(params?: PageParams, signal?: AbortSignal): Promise<Page<Homework>> {
  const data = await client<unknown>(`/homework${pageQuery(params)}`, { signal });
  return normalizePage<Homework>(data);
}
