import { client } from "../client";
import type { WeeklySlot } from "../client";

// The template week, weekday first, then start time.
export function getOfferingWeeklyPlan(id: string, signal?: AbortSignal): Promise<WeeklySlot[]> {
  return client<WeeklySlot[]>(`/offerings/${id}/weekly-plan`, { signal });
}
