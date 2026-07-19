import { client } from "./client";

export function deleteExamChoiceImage(examId: string, questionId: string, index: number): Promise<void> {
  return client<void>(`/exams/${examId}/questions/${questionId}/choices/${index}/image`, { method: "DELETE" });
}
