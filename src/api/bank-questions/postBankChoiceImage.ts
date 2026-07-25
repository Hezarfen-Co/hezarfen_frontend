import { formClient } from "../client";
import type { ImageMeta } from "../client";

export function postBankChoiceImage(bankQuestionId: string, choiceId: string, file: File, signal?: AbortSignal): Promise<ImageMeta> {
  const body = new FormData();
  body.append("file", file);
  return formClient<ImageMeta>(`/bank-questions/${bankQuestionId}/choices/${choiceId}/image`, body, signal);
}
