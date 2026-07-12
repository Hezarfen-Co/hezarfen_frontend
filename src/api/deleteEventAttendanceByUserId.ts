import { client } from "./client";

export function deleteEventAttendanceByUserId(
  eventId: string,
  userId: string,
): Promise<void> {
  return client<void>(`/events/${eventId}/attendance/${userId}`, {
    method: "DELETE",
  });
}
