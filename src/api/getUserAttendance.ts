import { client } from "./client";
import type { AttendanceReport } from "./types";

function userKey(userId: string): string {
  return userId.includes(":") ? userId.split(":").pop()! : userId;
}

export function getUserAttendance(userId: string, signal?: AbortSignal): Promise<AttendanceReport> {
  return client<AttendanceReport>(`/attendance/${encodeURIComponent(userKey(userId))}`, { signal });
}
