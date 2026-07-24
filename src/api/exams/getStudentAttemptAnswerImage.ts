import { blobClient } from "../client";

/** Grader view of a specific past sitting's answer image (mirrors getStudentAnswerImage, scoped to a seq). */
export async function getStudentAttemptAnswerImage(
  examId: string,
  userId: string,
  seq: number,
  questionId: string,
  signal?: AbortSignal,
): Promise<Blob> {
  return blobClient(`/exams/${examId}/students/${userId}/attempts/${seq}/answers/${questionId}/image`, signal);
}
