import { client } from "../client";
import { normalizePage, type Page } from "../client";
import type { Course } from "../client";
import { courseListQuery, type CourseListParams } from "../courses/getCourses";

export async function getMyCourses(params?: CourseListParams, signal?: AbortSignal): Promise<Page<Course>> {
  const data = await client<unknown>(`/courses/me${courseListQuery(params)}`, { signal });
  return normalizePage<Course>(data);
}
