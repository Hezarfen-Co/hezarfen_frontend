import { client } from "../client";

export function deleteOfferingSubjectById(id: string, subjectId: string): Promise<void> {
  return client<void>(`/offerings/${id}/subjects/${subjectId}`, { method: "DELETE" });
}
