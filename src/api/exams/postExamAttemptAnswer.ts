import { client } from "../client";
import type { AttemptAnswer } from "../client";

export type PostExamAttemptAnswerBody = {
  question_id: string;
  selected?: string | null; // choice id
  text?: string | null;
};

export function postExamAttemptAnswer(
  examId: string,
  body: PostExamAttemptAnswerBody,
): Promise<AttemptAnswer> {
  return client<AttemptAnswer>(`/exams/${examId}/attempt/answers`, { method: "POST", body });
}
