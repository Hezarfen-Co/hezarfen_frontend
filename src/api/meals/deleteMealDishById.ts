import { client } from "../client";

export function deleteMealDishById(id: string): Promise<void> {
  return client<void>(`/meals/dishes/${encodeURIComponent(id)}`, { method: "DELETE" });
}
