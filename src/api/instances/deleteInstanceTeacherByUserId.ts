import { client } from "../client";

/** Manager+ only. The instance, its exams, sessions and roster are untouched. */
export function deleteInstanceTeacherByUserId(instanceId: string, userId: string): Promise<void> {
  return client<void>(`/instances/${instanceId}/teachers/${userId}`, { method: "DELETE" });
}
