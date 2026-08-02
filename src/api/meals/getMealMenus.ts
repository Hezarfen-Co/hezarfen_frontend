import { client } from "../client";
import { appendPageParams, normalizePage, type Page, type PageParams } from "../client";
import type { MealMenu } from "../client";

export type MealMenuParams = PageParams & { from?: string; to?: string };

export async function getMealMenus(params?: MealMenuParams, signal?: AbortSignal): Promise<Page<MealMenu>> {
  const query = new URLSearchParams();
  appendPageParams(query, params);
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  const data = await client<unknown>(`/meals/menus${query.size ? `?${query}` : ""}`, { signal });
  return normalizePage<MealMenu>(data);
}
