import { blobClient } from "../client";

export function getBankChoiceImageBlob(bankQuestionId: string, index: number, signal?: AbortSignal): Promise<Blob> {
  return blobClient(`/bank-questions/${bankQuestionId}/choices/${index}/image`, signal);
}
