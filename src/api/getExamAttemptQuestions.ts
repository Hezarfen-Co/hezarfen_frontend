import { client } from "./client";
import type { AttemptQuestion } from "./types";

export function getExamAttemptQuestions(examId: string, signal?: AbortSignal): Promise<AttemptQuestion[]> {
  return client<AttemptQuestion[]>(`/exams/${examId}/attempt/questions`, { signal });
}
