import { client } from "../client";
import type { ExamQuestion, QuestionKind } from "../client";

export type ExamQuestionBody = {
  subject_id: string;
  text: string;
  kind: QuestionKind;
  points: number;
  choices?: string[] | null;
  correct?: number | null;
};

export function postExamQuestion(examId: string, body: ExamQuestionBody): Promise<ExamQuestion> {
  return client<ExamQuestion>(`/exams/${examId}/questions`, { method: "POST", body });
}
