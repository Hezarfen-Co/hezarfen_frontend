import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { Homework } from "../client";

export async function getCourseHomework(
  courseId: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<Homework>> {
  const data = await client<unknown>(`/courses/${courseId}/homework${pageQuery(params)}`, { signal });
  return normalizePage<Homework>(data);
}
