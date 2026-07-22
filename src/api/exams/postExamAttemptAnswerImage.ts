import { formClient } from "../client";
import type { ImageMeta } from "../client";

export function postExamAttemptAnswerImage(examId: string, questionId: string, file: File, signal?: AbortSignal): Promise<ImageMeta> {
  const body = new FormData();
  body.append("file", file);
  return formClient<ImageMeta>(`/exams/${examId}/attempt/answers/${questionId}/image`, body, signal);
}
