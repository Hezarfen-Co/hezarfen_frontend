import { client } from "../client";
import type { BankQuestion, BankVisibility, QuestionKind } from "../client";

export type PatchBankQuestionBody = {
  subject_id?: string;
  text?: string;
  kind?: QuestionKind;
  points?: number;
  /** Each option carries its key: a known key keeps that option (and its image), any other is new. */
  choices?: { id?: string | null; text: string }[] | null;
  /** Choice id — must name one of the submitted choices. */
  correct?: string | null;
  /** Publishing (`school`) hands the answer key to every teacher — send it only on an explicit choice. */
  visibility?: BankVisibility;
};

export function patchBankQuestionById(
  bankQuestionId: string,
  body: PatchBankQuestionBody,
): Promise<BankQuestion> {
  return client<BankQuestion>(`/bank-questions/${bankQuestionId}`, { method: "PATCH", body });
}
