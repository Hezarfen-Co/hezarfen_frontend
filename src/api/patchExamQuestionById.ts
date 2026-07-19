import { client } from "./client";
import type { ExamQuestion, QuestionKind } from "./types";

export type PatchExamQuestionBody = {
  subject_id?: string;
  text?: string | null;
  kind?: QuestionKind | null;
  points?: number | null;
  choices?: string[] | null;
  correct?: number | null;
};

export function patchExamQuestionById(
  examId: string,
  questionId: string,
  body: PatchExamQuestionBody,
): Promise<ExamQuestion> {
  return client<ExamQuestion>(`/exams/${examId}/questions/${questionId}`, { method: "PATCH", body });
}
