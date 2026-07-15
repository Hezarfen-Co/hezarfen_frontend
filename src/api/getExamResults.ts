import { client } from "./client";
import { normalizePage, pageQuery, type Page, type PageParams } from "./page";
import type { ExamResult } from "./types";

export async function getExamResults(
  examId: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<ExamResult>> {
  const data = await client<unknown>(`/exams/${examId}/results${pageQuery(params)}`, { signal });
  return normalizePage<ExamResult>(data);
}
