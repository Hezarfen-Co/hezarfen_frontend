import { client } from "@/api/client";
import type { StudentAnswerSheet } from "@/api/client";

export async function getStudentAnswers(examId: string, userId: string, signal?: AbortSignal): Promise<StudentAnswerSheet> {
  return client<StudentAnswerSheet>(`/exams/${encodeURIComponent(examId)}/attempts/${encodeURIComponent(userId)}/answers`, { signal });
}
