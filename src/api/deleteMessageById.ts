import { client } from "./client";

export function deleteMessageById(id: string): Promise<void> {
  return client<void>(`/messages/${id}`, { method: "DELETE" });
}
