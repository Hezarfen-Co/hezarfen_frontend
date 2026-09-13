import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { School } from "../client";

export async function getSchools(params?: PageParams, signal?: AbortSignal): Promise<Page<School>> {
  const data = await client<unknown>(`/schools${pageQuery(params)}`, { signal });
  return normalizePage<School>(data);
}
