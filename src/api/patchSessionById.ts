import { client } from "./client";
import type { CourseSession } from "./types";

export type PatchSessionBody = {
  topic?: string | null;
  teacher_id?: string | null;
  starts_at?: number | null;
  ends_at?: number | null;
};

export function patchSessionById(id: string, body: PatchSessionBody): Promise<CourseSession> {
  return client<CourseSession>(`/sessions/${id}`, { method: "PATCH", body });
}
