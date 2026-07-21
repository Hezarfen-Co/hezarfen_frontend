import { blobClient } from "../client";

export function getExamQuestionImageBlob(examId: string, questionId: string, signal?: AbortSignal): Promise<Blob> {
  return blobClient(`/exams/${examId}/questions/${questionId}/image`, signal);
}
