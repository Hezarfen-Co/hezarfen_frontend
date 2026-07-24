import { client } from "../client";
import type { BankQuestion, QuestionKind } from "../client";

export type PatchBankQuestionBody = {
  subject_id?: string;
  text?: string;
  kind?: QuestionKind;
  points?: number;
  choices?: string[] | null;
  correct?: number | null;
};

export function patchBankQuestionById(
  bankQuestionId: string,
  body: PatchBankQuestionBody,
): Promise<BankQuestion> {
  return client<BankQuestion>(`/bank-questions/${bankQuestionId}`, { method: "PATCH", body });
}
