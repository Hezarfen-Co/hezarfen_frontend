import { client } from "../client";

export function deleteExamAudienceByInstanceId(examId: string, instanceId: string): Promise<void> {
  return client<void>(`/exams/${examId}/audience/${instanceId}`, { method: "DELETE" });
}
