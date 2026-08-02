import { client } from "@/api/client";
import type { StudentAnswerSheet } from "@/api/client";

/** Grader view of a specific past sitting's answer sheet (same shape as the current attempt). */
export async function getStudentAttemptAnswers(
  examId: string,
  userId: string,
  seq: number,
  signal?: AbortSignal,
): Promise<StudentAnswerSheet> {
  return client<StudentAnswerSheet>(
    `/exams/${encodeURIComponent(examId)}/students/${encodeURIComponent(userId)}/attempts/${seq}/answers`,
    { signal },
  );
}
