import { blobClient } from "../client";

export function getBankQuestionImageBlob(bankQuestionId: string, signal?: AbortSignal): Promise<Blob> {
  return blobClient(`/bank-questions/${bankQuestionId}/image`, signal);
}
