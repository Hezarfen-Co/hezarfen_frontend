import { formClient } from "../client";
import type { ImageMeta } from "../client";

export function postExamChoiceImage(examId: string, questionId: string, choiceId: string, file: File, signal?: AbortSignal): Promise<ImageMeta> {
  const body = new FormData();
  body.append("file", file);
  return formClient<ImageMeta>(`/exams/${examId}/questions/${questionId}/choices/${choiceId}/image`, body, signal);
}
