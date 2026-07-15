import { client } from "./client";
import type { AttendanceReport } from "./types";

export function getUserAttendance(userId: string, signal?: AbortSignal): Promise<AttendanceReport> {
  return client<AttendanceReport>(`/attendance/${userId}`, { signal });
}
