import { client } from "../client";

// Manager+. A 409 `offering_in_use` while any section still teaches from it.
export function deleteOfferingById(id: string): Promise<void> {
  return client<void>(`/offerings/${id}`, { method: "DELETE" });
}
