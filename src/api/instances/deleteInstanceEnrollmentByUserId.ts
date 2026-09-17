import { client } from "../client";

/** Existing exam results are kept — they leave the marks report until re-enrolled. */
export function deleteInstanceEnrollmentByUserId(instanceId: string, userId: string): Promise<void> {
  return client<void>(`/instances/${instanceId}/enrollments/${userId}`, { method: "DELETE" });
}
