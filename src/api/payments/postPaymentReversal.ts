import { client } from "../client";
import type { PaymentLine, RecordReversalBody } from "./types";

// Undo a charge or refund line for its exact amount.
export function postPaymentReversal(body: RecordReversalBody): Promise<PaymentLine> {
  return client<PaymentLine>("/payments/reversals", { method: "POST", body });
}
