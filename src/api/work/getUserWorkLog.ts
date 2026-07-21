import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { WorkEntry } from "../client";

export async function getUserWorkLog(
  userId: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<WorkEntry>> {
  const data = await client<unknown>(`/work/${userId}${pageQuery(params)}`, { signal });
  return normalizePage<WorkEntry>(data);
}
