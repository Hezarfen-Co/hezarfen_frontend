import { client } from "../client";

// Sweeps the student's class-pumped enrollment rows; hand-placed rows stay.
export function deleteClassMember(classId: string, userId: string): Promise<void> {
  return client<void>(`/classes/${classId}/members/${userId}`, { method: "DELETE" });
}
