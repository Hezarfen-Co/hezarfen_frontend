import { client } from "../client";
import type { MealBalance } from "../client";

export function getMyMealBalance(signal?: AbortSignal): Promise<MealBalance> {
  return client<MealBalance>("/meals/balance/me", { signal });
}
