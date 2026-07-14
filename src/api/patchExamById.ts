import { client } from "./client";
import type { Exam } from "./types";

export type PatchExamBody = {
  title?: string | null;
  description?: string | null;
  kind?: string | null;
  mode?: string | null;
  starts_at?: number | null;
  ends_at?: number | null;
  duration_ms?: number | null;
  max_attempts?: number | null;
  allow_rejoin?: boolean | null;
};

export function patchExamById(id: string, body: PatchExamBody): Promise<Exam> {
  return client<Exam>(`/exams/${id}`, { method: "PATCH", body });
}
