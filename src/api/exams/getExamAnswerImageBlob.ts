import { blobClient } from "../client";

export async function getExamAnswerImageBlob(examId: string, questionId: string, signal?: AbortSignal): Promise<Blob> {
  return blobClient(`/exams/${examId}/attempt/answers/${questionId}/image`, signal);
}
