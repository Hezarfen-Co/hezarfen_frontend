import { formClient } from "../client";
import type { ImageMeta } from "../client";

export function postExamChoiceImage(examId: string, questionId: string, index: number, file: File, signal?: AbortSignal): Promise<ImageMeta> {
  const body = new FormData();
  body.append("file", file);
  return formClient<ImageMeta>(`/exams/${examId}/questions/${questionId}/choices/${index}/image`, body, signal);
}
