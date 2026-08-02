import { client } from "../client";
import type { BankQuestion } from "../client";

export function getBankQuestionById(bankQuestionId: string, signal?: AbortSignal): Promise<BankQuestion> {
  return client<BankQuestion>(`/bank-questions/${bankQuestionId}`, { signal });
}
