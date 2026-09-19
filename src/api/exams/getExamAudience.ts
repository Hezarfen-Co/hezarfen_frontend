import { client } from "../client";
import type { ExamAudience } from "../client";

/**
 * Every instance the exam is announced to, its owner first, then in
 * announcement order. A plain array — the door takes no paging.
 */
export function getExamAudience(examId: string, signal?: AbortSignal): Promise<ExamAudience[]> {
  return client<ExamAudience[]>(`/exams/${examId}/audience`, { signal });
}
