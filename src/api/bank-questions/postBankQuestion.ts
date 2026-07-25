import { client } from "../client";
import type { BankQuestion, QuestionKind } from "../client";

export type BankQuestionBody = {
  subject_id: string;
  text: string;
  kind: QuestionKind;
  points: number;
  /** Each option carries its key: a known key keeps that option (and its image), any other is new. */
  choices?: { id?: string | null; text: string }[] | null;
  /** Choice id — must name one of the submitted choices. */
  correct?: string | null;
};

export function postBankQuestion(body: BankQuestionBody): Promise<BankQuestion> {
  return client<BankQuestion>(`/bank-questions`, { method: "POST", body });
}
