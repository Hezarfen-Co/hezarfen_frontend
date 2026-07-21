import { client } from "../client";
import type { AttendanceReport } from "../client";

export function getMyAttendance(signal?: AbortSignal): Promise<AttendanceReport> {
  return client<AttendanceReport>("/attendance/me", { signal });
}
