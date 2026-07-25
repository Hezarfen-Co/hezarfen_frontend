import { blobClient } from "../client";

export function getBankChoiceImageBlob(bankQuestionId: string, choiceId: string, signal?: AbortSignal): Promise<Blob> {
  return blobClient(`/bank-questions/${bankQuestionId}/choices/${choiceId}/image`, signal);
}
