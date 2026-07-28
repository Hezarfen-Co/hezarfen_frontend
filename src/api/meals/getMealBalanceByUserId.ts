import { client } from "../client";
import type { MealBalance } from "../client";

export function getMealBalanceByUserId(userId: string, signal?: AbortSignal): Promise<MealBalance> {
  return client<MealBalance>(`/meals/balance/${encodeURIComponent(userId)}`, { signal });
}
