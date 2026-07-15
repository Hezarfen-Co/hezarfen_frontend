import { client } from "./client";
import { normalizePage, pageQuery, type Page, type PageParams } from "./page";
import type { Enrollment } from "./types";

export async function getCourseEnrollments(
  courseId: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<Enrollment>> {
  const data = await client<unknown>(`/courses/${courseId}/enrollments${pageQuery(params)}`, { signal });
  return normalizePage<Enrollment>(data);
}
