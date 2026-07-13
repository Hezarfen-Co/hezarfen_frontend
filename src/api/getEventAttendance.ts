import { client } from "./client";
import type { Attendance } from "./types";

export function getEventAttendance(
  eventId: string,
  signal?: AbortSignal,
): Promise<Attendance[]> {
  return client<Attendance[]>(`/events/${eventId}/attendance`, { signal });
}
