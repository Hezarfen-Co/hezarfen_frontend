import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { ClassGroup } from "../client";

export async function getMyClasses(params?: PageParams, signal?: AbortSignal): Promise<Page<ClassGroup>> {
  const data = await client<unknown>(`/classes/me${pageQuery(params)}`, { signal });
  return normalizePage<ClassGroup>(data);
}
