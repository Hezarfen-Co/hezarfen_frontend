import { client } from "../client";
import type { ExamQuestion } from "../client";

/**
 * Re-copy the question's bank template over it — the escape hatch for a copy that
 * drifted from its template (a bank↔exam copy is deep, never a live link). Only
 * for a question that still has `from_bank`; the backend refuses with 409 once
 * any attempt exists, and 400 when there is no template to refresh from.
 */
export function postExamQuestionRefreshFromBank(
  examId: string,
  questionId: string,
): Promise<ExamQuestion> {
  return client<ExamQuestion>(`/exams/${examId}/questions/${questionId}/refresh-from-bank`, {
    method: "POST",
  });
}
