import { client } from "../client";
import type { ExamResult } from "../client";

/** Full mark history for a student, oldest-first — index 0 = seq 1 (marks carry no seq). Grader-only. */
export async function getStudentMarksHistory(
  examId: string,
  userId: string,
  signal?: AbortSignal,
): Promise<ExamResult[]> {
  return client<ExamResult[]>(`/exams/${encodeURIComponent(examId)}/students/${encodeURIComponent(userId)}/marks`, { signal });
}
