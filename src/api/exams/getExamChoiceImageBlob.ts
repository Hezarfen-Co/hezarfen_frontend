import { blobClient } from "../client";

export function getExamChoiceImageBlob(examId: string, questionId: string, index: number, signal?: AbortSignal): Promise<Blob> {
  return blobClient(`/exams/${examId}/questions/${questionId}/choices/${index}/image`, signal);
}
