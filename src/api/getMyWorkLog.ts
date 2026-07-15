import { client } from "./client";
import { normalizePage, pageQuery, type Page, type PageParams } from "./page";
import type { WorkEntry } from "./types";

export async function getMyWorkLog(params?: PageParams, signal?: AbortSignal): Promise<Page<WorkEntry>> {
  const data = await client<unknown>(`/work/me${pageQuery(params)}`, { signal });
  return normalizePage<WorkEntry>(data);
}
