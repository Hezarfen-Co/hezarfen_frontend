import { client } from "../client";

// Drops one topic from the section's own set; the set stays the section's own.
export function deleteInstanceSubjectById(id: string, subjectId: string): Promise<void> {
  return client<void>(`/instances/${id}/subjects/${subjectId}`, { method: "DELETE" });
}
