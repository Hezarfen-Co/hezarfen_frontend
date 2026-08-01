import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { MealAttendance } from "../client";

export async function getMealMenuAttendance(
  menuId: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<MealAttendance>> {
  const data = await client<unknown>(
    `/meals/menus/${encodeURIComponent(menuId)}/attendance${pageQuery(params)}`,
    { signal },
  );
  return normalizePage<MealAttendance>(data);
}
