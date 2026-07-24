import { client } from "../client";
import type { BankQuestion, QuestionKind } from "../client";

export type BankQuestionBody = {
  subject_id: string;
  text: string;
  kind: QuestionKind;
  points: number;
  choices?: string[] | null;
  correct?: number | null;
};

export function postBankQuestion(body: BankQuestionBody): Promise<BankQuestion> {
  return client<BankQuestion>(`/bank-questions`, { method: "POST", body });
}
