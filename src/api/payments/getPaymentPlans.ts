import { client, normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { FeePlan } from "./types";

export async function getPaymentPlans(
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<FeePlan>> {
  const data = await client<unknown>(`/payments/plans${pageQuery(params)}`, { signal });
  return normalizePage<FeePlan>(data);
}
