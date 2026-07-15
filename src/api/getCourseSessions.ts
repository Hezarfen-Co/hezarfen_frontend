import { client } from "./client";
import { normalizePage, pageQuery, type Page, type PageParams } from "./page";
import type { CourseSession } from "./types";

export async function getCourseSessions(
  courseId: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<CourseSession>> {
  const data = await client<unknown>(`/courses/${courseId}/sessions${pageQuery(params)}`, { signal });
  return normalizePage<CourseSession>(data);
}
