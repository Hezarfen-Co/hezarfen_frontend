import { client, pageQuery, type PageParams } from "../client";
import type { PaymentStatement } from "./types";

// Statement is not itself a Page envelope: { student, entries: Page, balance_minor }.
export function getMyPaymentStatement(
  params?: PageParams,
  signal?: AbortSignal,
): Promise<PaymentStatement> {
  return client<PaymentStatement>(`/payments/statement/me${pageQuery(params)}`, { signal });
}
