import { client } from "@/api/client";
import type { StudentAnswerSheet } from "@/api/client";

/** Self-review of one of the caller's own past sittings (same shape as the current attempt). */
export async function getExamReviewAttemptAnswers(
  examId: string,
  seq: number,
  signal?: AbortSignal,
): Promise<StudentAnswerSheet> {
  return client<StudentAnswerSheet>(
    `/exams/${encodeURIComponent(examId)}/review/attempts/${seq}/answers`,
    { signal },
  );
}
