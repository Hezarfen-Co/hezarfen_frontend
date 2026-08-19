import { client } from "../client";
import { appendPageParams, normalizePage, type Page, type PageParams } from "../client";
import type { CourseNote } from "../client";

export async function getCourseNotes(courseId: string, params?: PageParams, signal?: AbortSignal): Promise<Page<CourseNote>> {
  const query = new URLSearchParams({ course: courseId });
  appendPageParams(query, params);
  const data = await client<unknown>(`/course-notes?${query.toString()}`, { signal });
  return normalizePage<CourseNote>(data);
}
