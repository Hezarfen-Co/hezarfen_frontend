import { client } from "./client";
import type { AttemptAnswer } from "./types";

export type PostExamAttemptAnswerBody = {
  question_id: string;
  selected?: number | null;
  text?: string | null;
};

export function postExamAttemptAnswer(
  examId: string,
  body: PostExamAttemptAnswerBody,
): Promise<AttemptAnswer> {
  return client<AttemptAnswer>(`/exams/${examId}/attempt/answers`, { method: "POST", body });
}
