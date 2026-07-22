import { blobClient } from "../client";

/** Grader view of a student's drawn/uploaded answer image (plural `attempts` + explicit user). */
export async function getStudentAnswerImage(
  examId: string,
  userId: string,
  questionId: string,
  signal?: AbortSignal,
): Promise<Blob> {
  return blobClient(`/exams/${examId}/attempts/${userId}/answers/${questionId}/image`, signal);
}
