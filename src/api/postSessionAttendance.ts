import { client } from "./client";
import type { AttendanceStatus, SessionAttendance } from "./types";

export type PostSessionAttendanceBody = {
  user_id: string;
  status: AttendanceStatus;
};

export function postSessionAttendance(id: string, body: PostSessionAttendanceBody): Promise<SessionAttendance> {
  return client<SessionAttendance>(`/sessions/${id}/attendance`, { method: "POST", body });
}
