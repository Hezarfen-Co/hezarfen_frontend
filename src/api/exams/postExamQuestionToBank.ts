import { client } from "../client";
import type { BankQuestion } from "../client";

/** Copy an exam question into the caller's question bank. */
export function postExamQuestionToBank(examId: string, questionId: string): Promise<BankQuestion> {
  return client<BankQuestion>(`/exams/${examId}/questions/${questionId}/to-bank`, { method: "POST" });
}
