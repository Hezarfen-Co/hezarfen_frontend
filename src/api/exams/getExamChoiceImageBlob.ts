import { blobClient } from "../client";

export function getExamChoiceImageBlob(examId: string, questionId: string, choiceId: string, signal?: AbortSignal): Promise<Blob> {
  return blobClient(`/exams/${examId}/questions/${questionId}/choices/${choiceId}/image`, signal);
}
