import { client } from "../client";

// Resets the week to inherit: drops every own slot, the template applies again.
export function deleteInstanceWeeklyPlan(id: string): Promise<void> {
  return client<void>(`/instances/${id}/weekly-plan`, { method: "DELETE" });
}
