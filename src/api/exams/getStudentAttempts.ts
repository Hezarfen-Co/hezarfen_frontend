import { client } from "@/api/client";

/** Sitting seqs a student has for this exam, ascending (e.g. [1, 2]). Grader-only. */
export async function getStudentAttempts(examId: string, userId: string, signal?: AbortSignal): Promise<number[]> {
  return client<number[]>(`/exams/${encodeURIComponent(examId)}/students/${encodeURIComponent(userId)}/attempts`, { signal });
}
