import { formClient } from "../client";
import type { ImageMeta } from "../client";

export function postExamQuestionImage(examId: string, questionId: string, file: File, signal?: AbortSignal): Promise<ImageMeta> {
  const body = new FormData();
  body.append("file", file);
  return formClient<ImageMeta>(`/exams/${examId}/questions/${questionId}/image`, body, signal);
}
