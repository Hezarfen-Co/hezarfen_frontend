import { client } from "../client";
import type { FeePlan, UpdateFeePlanBody } from "./types";

export function patchPaymentPlanById(id: string, body: UpdateFeePlanBody): Promise<FeePlan> {
  return client<FeePlan>(`/payments/plans/${encodeURIComponent(id)}`, { method: "PATCH", body });
}
