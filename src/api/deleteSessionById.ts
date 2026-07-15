import { client } from "./client";

export function deleteSessionById(id: string): Promise<void> {
  return client<void>(`/sessions/${id}`, { method: "DELETE" });
}
