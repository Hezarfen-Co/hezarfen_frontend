import { client } from "../client";
import type { ExamAudience } from "../client";

/**
 * Announce the exam to another instance. It must teach the exam's own catalog
 * course, sit under the same academic year, and be a different instance — the
 * owner is refused with a 400.
 */
export function postExamAudience(examId: string, instanceId: string): Promise<ExamAudience> {
  return client<ExamAudience>(`/exams/${examId}/audience`, {
    method: "POST",
    body: { instance: instanceId },
  });
}
