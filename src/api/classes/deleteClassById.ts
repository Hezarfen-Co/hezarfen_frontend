import { client } from "../client";

// 409 if the class still holds students or courses — nothing cascades.
export function deleteClassById(id: string): Promise<void> {
  return client<void>(`/classes/${id}`, { method: "DELETE" });
}
