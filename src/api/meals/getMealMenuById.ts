import { client } from "../client";
import type { MealMenu } from "../client";

export function getMealMenuById(id: string, signal?: AbortSignal): Promise<MealMenu> {
  return client<MealMenu>(`/meals/menus/${encodeURIComponent(id)}`, { signal });
}
