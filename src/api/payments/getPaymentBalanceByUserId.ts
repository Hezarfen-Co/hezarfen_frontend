import { client } from "../client";
import type { PaymentBalance } from "./types";

export function getPaymentBalanceByUserId(
  userId: string,
  signal?: AbortSignal,
): Promise<PaymentBalance> {
  return client<PaymentBalance>(`/payments/balance/${encodeURIComponent(userId)}`, { signal });
}
