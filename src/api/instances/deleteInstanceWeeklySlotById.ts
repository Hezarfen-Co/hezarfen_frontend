import { client } from "../client";

// Dropping the last own slot leaves an empty own plan, not a return to inherit.
export function deleteInstanceWeeklySlotById(id: string, slotId: string): Promise<void> {
  return client<void>(`/instances/${id}/weekly-plan/${slotId}`, { method: "DELETE" });
}
