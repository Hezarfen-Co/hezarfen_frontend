import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { Course } from "../client";

export async function getCourses(params?: PageParams, signal?: AbortSignal): Promise<Page<Course>> {
  const data = await client<unknown>(`/courses${pageQuery(params)}`, { signal });
  return normalizePage<Course>(data);
}
