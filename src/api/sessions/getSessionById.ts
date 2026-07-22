import { client } from "../client";
import type { CourseSession } from "../client";

export function getSessionById(id: string, signal?: AbortSignal): Promise<CourseSession> {
  return client<CourseSession>(`/sessions/${id}`, { signal });
}
