import { client } from "../client";

export function deleteMealMenuById(id: string): Promise<void> {
  return client<void>(`/meals/menus/${encodeURIComponent(id)}`, { method: "DELETE" });
}
