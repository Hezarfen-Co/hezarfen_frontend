import { client } from "./client";
import { normalizePage, pageQuery, type Page, type PageParams } from "./page";
import type { Exam } from "./types";

export async function getCourseExams(
  courseId: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<Exam>> {
  const data = await client<unknown>(`/courses/${courseId}/exams${pageQuery(params)}`, { signal });
  return normalizePage<Exam>(data);
}
