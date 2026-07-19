import type { ExamQuestion, StudentAnswer } from "@/api/types";

export type AnswerSheetRow = {
  question: ExamQuestion;
  answer: StudentAnswer | null;
};

/** Pair the exam's questions with a student's answers (`answer.question` → `question.id`).
 * Unanswered questions get `answer: null`; answers to deleted questions are dropped. */
export function joinAnswerSheet(questions: ExamQuestion[], answers: StudentAnswer[]): AnswerSheetRow[] {
  const byQuestion = new Map(answers.map((answer) => [answer.question, answer]));
  return questions.map((question) => ({
    question,
    answer: byQuestion.get(question.id) ?? null,
  }));
}
