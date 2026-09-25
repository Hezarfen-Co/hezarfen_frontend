import { client } from "../client";
import type { Instance, InstanceOverrideField } from "../client";

// Clears the named overrides back to inherit; a set field (subjects,
// exam_weights, weekly_plan) flips its flag back to inherited.
export function postInstanceReset(id: string, fields: InstanceOverrideField[]): Promise<Instance> {
  return client<Instance>(`/instances/${id}/reset`, { method: "POST", body: { fields } });
}
