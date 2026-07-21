import { client } from "../client";
import type { ExamResult } from "../client";

export type PostExamResultBody = {
  mark: number;
  user_id: string;
};

export function postExamResult(
  examId: string,
  body: PostExamResultBody,
): Promise<ExamResult> {
  return client<ExamResult>(`/exams/${examId}/results`, {
    method: "POST",
    body,
  });
}
