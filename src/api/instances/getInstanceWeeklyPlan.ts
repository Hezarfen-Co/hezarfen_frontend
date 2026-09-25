import { client } from "../client";
import type { WeeklySlot } from "../client";

export type InstanceWeeklyPlan = { weekly_plan: WeeklySlot[]; weekly_plan_inherited: boolean };

export function getInstanceWeeklyPlan(id: string, signal?: AbortSignal): Promise<InstanceWeeklyPlan> {
  return client<InstanceWeeklyPlan>(`/instances/${id}/weekly-plan`, { signal });
}
