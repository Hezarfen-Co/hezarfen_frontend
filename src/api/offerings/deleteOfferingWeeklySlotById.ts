import { client } from "../client";

export function deleteOfferingWeeklySlotById(id: string, slotId: string): Promise<void> {
  return client<void>(`/offerings/${id}/weekly-plan/${slotId}`, { method: "DELETE" });
}
