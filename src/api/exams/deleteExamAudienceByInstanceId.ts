import { client } from "../client";
import type { ExamAudience } from "../client";

/** Withdraw the exam from one instance. Answers the audience left behind; the owner is not withdrawable (400). */
export function deleteExamAudienceByInstanceId(examId: string, instanceId: string): Promise<ExamAudience[]> {
  return client<ExamAudience[]>(`/exams/${examId}/audience/${instanceId}`, { method: "DELETE" });
}
