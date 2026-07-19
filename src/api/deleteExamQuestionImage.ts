import { client } from "./client";

export function deleteExamQuestionImage(examId: string, questionId: string): Promise<void> {
  return client<void>(`/exams/${examId}/questions/${questionId}/image`, { method: "DELETE" });
}
