import { client } from "../client";
import type { PaymentLine, RecordRefundBody } from "./types";

// Hand back a recorded payment (credit line).
export function postPaymentRefund(body: RecordRefundBody): Promise<PaymentLine> {
  return client<PaymentLine>("/payments/refunds", { method: "POST", body });
}
