import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { MealServiceRosterEntry } from "../client";

export async function getMealServiceRoster(
  menuId: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<MealServiceRosterEntry>> {
  const data = await client<unknown>(
    `/meals/menus/${encodeURIComponent(menuId)}/service-roster${pageQuery(params)}`,
    { signal },
  );
  return normalizePage<MealServiceRosterEntry>(data);
}
