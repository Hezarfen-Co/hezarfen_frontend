import { client } from "../client";
import type { PaymentLine, RecordPaymentBody } from "./types";

// Record a payment against a charge line.
export function postPaymentCredit(body: RecordPaymentBody): Promise<PaymentLine> {
  return client<PaymentLine>("/payments/credits", { method: "POST", body });
}
