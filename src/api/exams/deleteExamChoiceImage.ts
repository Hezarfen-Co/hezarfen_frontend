import { client } from "../client";

export function deleteExamChoiceImage(examId: string, questionId: string, choiceId: string): Promise<void> {
  return client<void>(`/exams/${examId}/questions/${questionId}/choices/${choiceId}/image`, { method: "DELETE" });
}
