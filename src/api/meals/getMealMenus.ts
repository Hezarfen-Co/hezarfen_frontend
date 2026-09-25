import { client } from "../client";
import { appendPageParams, normalizePage, type Page, type PageParams } from "../client";
import type { MealMenu } from "../client";

export type MealMenuParams = PageParams & { from?: string; to?: string; slot?: string };

export async function getMealMenus(params?: MealMenuParams, signal?: AbortSignal): Promise<Page<MealMenu>> {
  const query = new URLSearchParams();
  appendPageParams(query, params);
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  // "all" is the page's pseudo-option for "no slot filter", never a real slot
  // name, and blank would serialize as a present-but-empty value the API
  // rejects — both must be dropped instead of sent.
  const slotFilter = params?.slot?.trim();
  if (slotFilter && slotFilter !== "all") query.set("slot", slotFilter);
  const data = await client<unknown>(`/meals/menus${query.size ? `?${query}` : ""}`, { signal });
  return normalizePage<MealMenu>(data);
}
