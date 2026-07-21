import { client } from "../client";
import type { ExamResult } from "../client";

export function getExamResult(
  examId: string,
  signal?: AbortSignal,
): Promise<ExamResult> {
  return client<ExamResult>(`/exams/${examId}/result`, { signal });
}
