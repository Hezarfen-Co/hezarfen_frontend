import { client } from "../client";

export function deletePaymentPlanById(id: string): Promise<void> {
  return client<void>(`/payments/plans/${encodeURIComponent(id)}`, { method: "DELETE" });
}
