import { client } from "../client";
import type { WeeklySlot } from "../client";
import type { CreateWeeklySlotBody } from "../offerings/postOfferingWeeklySlot";

// Adds a slot to the section's own week; from here its own rows are the plan.
export function postInstanceWeeklySlot(id: string, body: CreateWeeklySlotBody): Promise<WeeklySlot> {
  return client<WeeklySlot>(`/instances/${id}/weekly-plan`, { method: "POST", body });
}
