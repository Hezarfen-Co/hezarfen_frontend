import { client } from "./client";
import type { Attendance, AttendanceStatus } from "./types";

export type PostEventAttendanceBody = {
  status: AttendanceStatus;
  user_id?: string | null;
};

export function postEventAttendance(
  eventId: string,
  body: PostEventAttendanceBody,
): Promise<Attendance> {
  return client<Attendance>(`/events/${eventId}/attendance`, {
    method: "POST",
    body,
  });
}
