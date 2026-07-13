import { client } from "./client";

export function deleteExamQuestionById(examId: string, questionId: string): Promise<void> {
  return client<void>(`/exams/${examId}/questions/${questionId}`, { method: "DELETE" });
}
