import { client } from "../client";
import type { MealMenu } from "../client";

export function postMealMenu(body: { date: string; slot: string; capacity?: number | null }): Promise<MealMenu> {
  return client<MealMenu>("/meals/menus", { method: "POST", body });
}
