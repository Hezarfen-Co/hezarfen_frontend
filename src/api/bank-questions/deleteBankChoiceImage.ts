import { client } from "../client";

export function deleteBankChoiceImage(bankQuestionId: string, index: number): Promise<void> {
  return client<void>(`/bank-questions/${bankQuestionId}/choices/${index}/image`, { method: "DELETE" });
}
