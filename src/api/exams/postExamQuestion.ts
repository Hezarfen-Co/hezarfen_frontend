import { client } from "../client";
import type { ExamQuestion, QuestionKind } from "../client";

export type ExamQuestionBody = {
  subject_id: string;
  text: string;
  kind: QuestionKind;
  points: number;
  /** Each option carries its key: a known key keeps that option (and its image), any other is new. */
  choices?: { id?: string | null; text: string }[] | null;
  /** Choice id — must name one of the submitted choices. */
  correct?: string | null;
};

export function postExamQuestion(examId: string, body: ExamQuestionBody): Promise<ExamQuestion> {
  return client<ExamQuestion>(`/exams/${examId}/questions`, { method: "POST", body });
}
