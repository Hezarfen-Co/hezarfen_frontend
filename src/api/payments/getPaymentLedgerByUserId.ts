import { client, normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { PaymentLine } from "./types";

export async function getPaymentLedgerByUserId(
  userId: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<PaymentLine>> {
  const data = await client<unknown>(
    `/payments/ledger/${encodeURIComponent(userId)}${pageQuery(params)}`,
    { signal },
  );
  return normalizePage<PaymentLine>(data);
}
