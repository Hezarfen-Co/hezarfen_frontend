import { client, pageQuery, type PageParams } from "../client";
import type { PaymentStatement } from "./types";

export function getPaymentStatementByUserId(
  userId: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<PaymentStatement> {
  return client<PaymentStatement>(
    `/payments/statement/${encodeURIComponent(userId)}${pageQuery(params)}`,
    { signal },
  );
}
