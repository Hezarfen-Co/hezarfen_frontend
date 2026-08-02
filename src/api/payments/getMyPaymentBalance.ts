import { client } from "../client";
import type { PaymentBalance } from "./types";

export function getMyPaymentBalance(signal?: AbortSignal): Promise<PaymentBalance> {
  return client<PaymentBalance>("/payments/balance/me", { signal });
}
