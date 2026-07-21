import { client } from "../client";

export function deleteEventById(id: string): Promise<void> {
  return client<void>(`/events/${id}`, { method: "DELETE" });
}
