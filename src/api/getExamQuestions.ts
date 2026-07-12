import { client } from "./client";
import type { ExamQuestion } from "./types";

export function getExamQuestions(examId: string, signal?: AbortSignal): Promise<ExamQuestion[]> {
  return client<ExamQuestion[]>(`/exams/${examId}/questions`, { signal });
}
