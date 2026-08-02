import { client } from "../client";

export function deleteBankChoiceImage(bankQuestionId: string, choiceId: string): Promise<void> {
  return client<void>(`/bank-questions/${bankQuestionId}/choices/${choiceId}/image`, { method: "DELETE" });
}
