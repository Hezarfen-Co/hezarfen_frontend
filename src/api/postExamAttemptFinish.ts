import { client } from "./client";
import type { ExamAttempt } from "./types";

export function postExamAttemptFinish(examId: string): Promise<ExamAttempt> {
  return client<ExamAttempt>(`/exams/${examId}/attempt/finish`, { method: "POST" });
}
