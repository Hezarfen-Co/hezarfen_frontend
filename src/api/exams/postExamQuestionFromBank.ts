import { client } from "../client";
import type { ExamQuestion } from "../client";

/** Copy a bank question into this exam; `subjectId` is the exam-side subject. */
export function postExamQuestionFromBank(
  examId: string,
  bankQuestionId: string,
  subjectId: string,
): Promise<ExamQuestion> {
  return client<ExamQuestion>(`/exams/${examId}/questions/from-bank/${bankQuestionId}`, {
    method: "POST",
    body: { subject_id: subjectId },
  });
}
