import { client } from "../client";
import type { MealDish } from "../client";
import type { MealDishBody } from "./postMealDish";

export function patchMealDishById(id: string, body: Partial<MealDishBody>): Promise<MealDish> {
  return client<MealDish>(`/meals/dishes/${encodeURIComponent(id)}`, { method: "PATCH", body });
}
