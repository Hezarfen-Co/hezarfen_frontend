import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { AcademicYear } from "../client";

/** Newest first. Requires teacher+. */
export async function getAcademicYears(params?: PageParams, signal?: AbortSignal): Promise<Page<AcademicYear>> {
  const data = await client<unknown>(`/academic-years${pageQuery(params)}`, { signal });
  return normalizePage<AcademicYear>(data);
}
