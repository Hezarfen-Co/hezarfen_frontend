import { client } from "./client";
import type { SessionAttendance } from "./types";

export function getSessionAttendance(id: string, signal?: AbortSignal): Promise<SessionAttendance[]> {
  return client<SessionAttendance[]>(`/sessions/${id}/attendance`, { signal });
}
