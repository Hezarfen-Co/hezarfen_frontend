import { blobClient } from "../client";

/** Self-review of one of the caller's own past sitting's answer images, scoped to a seq. */
export async function getExamReviewAttemptAnswerImage(
  examId: string,
  seq: number,
  questionId: string,
  signal?: AbortSignal,
): Promise<Blob> {
  return blobClient(`/exams/${examId}/review/attempts/${seq}/answers/${questionId}/image`, signal);
}
