import { client } from "../client";

export function deleteBankQuestionImage(bankQuestionId: string): Promise<void> {
  return client<void>(`/bank-questions/${bankQuestionId}/image`, { method: "DELETE" });
}
