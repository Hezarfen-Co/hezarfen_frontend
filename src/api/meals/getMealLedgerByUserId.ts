import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { MealLedgerEntry } from "../client";

export async function getMealLedgerByUserId(
  userId: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<MealLedgerEntry>> {
  const data = await client<unknown>(`/meals/ledger/${encodeURIComponent(userId)}${pageQuery(params)}`, { signal });
  return normalizePage<MealLedgerEntry>(data);
}
