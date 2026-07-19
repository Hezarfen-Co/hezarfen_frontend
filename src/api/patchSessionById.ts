import { client } from "./client";
import type { CourseSession } from "./types";

/** Omitted fields keep their value. Only `ends_at` clears on explicit null. */
export type PatchSessionBody = {
  topic?: string;
  teacher_id?: string;
  starts_at?: number;
  ends_at?: number | null;
};

export function patchSessionById(id: string, body: PatchSessionBody): Promise<CourseSession> {
  return client<CourseSession>(`/sessions/${id}`, { method: "PATCH", body });
}
