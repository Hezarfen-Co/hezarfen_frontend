import { client } from "../client";

export function deleteExamAttemptAnswerImage(examId: string, questionId: string): Promise<void> {
  return client<void>(`/exams/${examId}/attempt/answers/${questionId}/image`, { method: "DELETE" });
}
