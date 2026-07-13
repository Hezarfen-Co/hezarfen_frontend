import { client } from "./client";
import type { ExamResult } from "./types";

export function getExamResult(
  examId: string,
  signal?: AbortSignal,
): Promise<ExamResult> {
  return client<ExamResult>(`/exams/${examId}/result`, { signal });
}
