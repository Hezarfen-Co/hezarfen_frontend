import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { ClassCourse } from "../client";

/**
 * The instances a class carries — each a catalog course as this section
 * teaches it, with its hours, karne policy and teachers. Requires teacher+.
 */
export async function getClassInstances(
  classId: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<ClassCourse>> {
  const data = await client<unknown>(`/classes/${classId}/instances${pageQuery(params)}`, { signal });
  return normalizePage<ClassCourse>(data);
}
