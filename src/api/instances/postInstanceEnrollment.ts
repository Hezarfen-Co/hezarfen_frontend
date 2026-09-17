import { client } from "../client";
import type { Enrollment } from "../client";

/**
 * Idempotent upsert; students only. The row is hand-placed (`source` null), so
 * no şube sweep takes it back.
 */
export function postInstanceEnrollment(instanceId: string, userId: string): Promise<Enrollment> {
  return client<Enrollment>(`/instances/${instanceId}/enrollments`, {
    method: "POST",
    body: { user_id: userId },
  });
}
