import { client } from "../client";
import type { Instance } from "../client";

/**
 * Manager+ only — staffing is the office's call. The assignee gets full
 * management of the instance but no catalog rights over the course itself.
 */
export function postInstanceTeacher(instanceId: string, userId: string): Promise<Instance> {
  return client<Instance>(`/instances/${instanceId}/teachers`, {
    method: "POST",
    body: { user_id: userId },
  });
}
