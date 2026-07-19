import { client } from "./client";

export function deleteEventRegisterByUserId(eventId: string, userId: string): Promise<void> {
  return client<void>(`/events/${eventId}/register/${userId}`, { method: "DELETE" });
}
