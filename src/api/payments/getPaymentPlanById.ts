import { client } from "../client";
import type { FeePlan } from "./types";

export function getPaymentPlanById(id: string, signal?: AbortSignal): Promise<FeePlan> {
  return client<FeePlan>(`/payments/plans/${encodeURIComponent(id)}`, { signal });
}
