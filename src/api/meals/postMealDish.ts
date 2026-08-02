import { client } from "../client";
import type { MealDish } from "../client";

export type MealDishBody = { name: string; description?: string | null; price_minor: number; tags: string[] };

export function postMealDish(menuId: string, body: MealDishBody): Promise<MealDish> {
  return client<MealDish>(`/meals/menus/${encodeURIComponent(menuId)}/dishes`, { method: "POST", body });
}
