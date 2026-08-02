import { client } from "../client";
import type { MealMenu } from "../client";

export function patchMealMenuById(id: string, body: { capacity?: number | null }): Promise<MealMenu> {
  return client<MealMenu>(`/meals/menus/${encodeURIComponent(id)}`, { method: "PATCH", body });
}
