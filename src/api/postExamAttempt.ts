import { client } from "./client";
import type { ExamAttempt } from "./types";

export function postExamAttempt(examId: string): Promise<ExamAttempt> {
  return client<ExamAttempt>(`/exams/${examId}/attempt`, { method: "POST" });
}
