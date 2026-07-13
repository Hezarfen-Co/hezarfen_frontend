import { client } from "./client";
import type { ExamResult } from "./types";

export function getExamResults(
  examId: string,
  signal?: AbortSignal,
): Promise<ExamResult[]> {
  return client<ExamResult[]>(`/exams/${examId}/results`, { signal });
}
