import { client } from "../client";

export function deleteBankQuestionById(bankQuestionId: string): Promise<void> {
  return client<void>(`/bank-questions/${bankQuestionId}`, { method: "DELETE" });
}
