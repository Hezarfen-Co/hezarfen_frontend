import { client } from "../client";
import type { WeeklySlot } from "../client";

/** Minutes past midnight; `weekday` 1 (Monday) .. 7. A null topic uses the title. */
export type CreateWeeklySlotBody = { weekday: number; starts_at: number; ends_at: number; topic?: string | null };

// Manager+. 409 `slot_overlap` for an intersecting window, `slot_cap` when full.
export function postOfferingWeeklySlot(id: string, body: CreateWeeklySlotBody): Promise<WeeklySlot> {
  return client<WeeklySlot>(`/offerings/${id}/weekly-plan`, { method: "POST", body });
}
