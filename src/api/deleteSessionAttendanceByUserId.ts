import { client } from "./client";

export function deleteSessionAttendanceByUserId(id: string, userId: string): Promise<void> {
  return client<void>(`/sessions/${id}/attendance/${userId}`, { method: "DELETE" });
}
