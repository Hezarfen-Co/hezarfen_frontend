import { client } from "../client";

export function deleteSubjectById(subjectId: string): Promise<void> {
  return client<void>(`/subjects/${subjectId}`, { method: "DELETE" });
}
