import { client } from "../client";
import type { ExamAttempt } from "../client";

export function getExamAttempt(examId: string, signal?: AbortSignal): Promise<ExamAttempt> {
  return client<ExamAttempt>(`/exams/${examId}/attempt`, { signal });
}
