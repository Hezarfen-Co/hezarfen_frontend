import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { ClassCourse } from "../client";

export async function getClassCourses(classId: string, params?: PageParams, signal?: AbortSignal): Promise<Page<ClassCourse>> {
  const data = await client<unknown>(`/classes/${classId}/courses${pageQuery(params)}`, { signal });
  return normalizePage<ClassCourse>(data);
}
