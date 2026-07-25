import { client } from "../client";
import type { ExamQuestion, QuestionKind } from "../client";

export type PatchExamQuestionBody = {
  subject_id?: string;
  text?: string | null;
  kind?: QuestionKind | null;
  points?: number | null;
  /** Each option carries its key: a known key keeps that option (and its image), any other is new. */
  choices?: { id?: string | null; text: string }[] | null;
  /** Choice id — must name one of the submitted choices. */
  correct?: string | null;
};

export function patchExamQuestionById(
  examId: string,
  questionId: string,
  body: PatchExamQuestionBody,
): Promise<ExamQuestion> {
  return client<ExamQuestion>(`/exams/${examId}/questions/${questionId}`, { method: "PATCH", body });
}
