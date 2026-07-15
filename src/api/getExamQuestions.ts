import { client } from "./client";
import { normalizePage, pageQuery, type Page, type PageParams } from "./page";
import type { ExamQuestion } from "./types";

export async function getExamQuestions(
  examId: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<ExamQuestion>> {
  const data = await client<unknown>(`/exams/${examId}/questions${pageQuery(params)}`, { signal });
  return normalizePage<ExamQuestion>(data);
}
