import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { Subject } from "../client";

export async function getCourseSubjects(
  courseId: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<Subject>> {
  const data = await client<unknown>(`/courses/${courseId}/subjects${pageQuery(params)}`, { signal });
  return normalizePage<Subject>(data);
}
