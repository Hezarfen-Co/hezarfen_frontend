import { client } from "../client";
import type { CreateFeePlanBody, FeePlan } from "./types";

export function postPaymentPlan(body: CreateFeePlanBody): Promise<FeePlan> {
  return client<FeePlan>("/payments/plans", { method: "POST", body });
}
