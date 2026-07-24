import { client } from "@/api/client";
import { normalizePage, pageQuery, type Page, type PageParams } from "@/api/client";
import type { ExamQuestion } from "@/api/client";

/** Self-review question list (with the correct-answer key) for an exam the caller has been marked on. */
export async function getExamReviewQuestions(
  examId: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<ExamQuestion>> {
  const data = await client<unknown>(
    `/exams/${encodeURIComponent(examId)}/review/questions${pageQuery(params)}`,
    { signal },
  );
  return normalizePage<ExamQuestion>(data);
}
