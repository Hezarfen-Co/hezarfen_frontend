import { client } from "./client";
import type { Exam } from "./types";

export type PatchExamBody = {
  title?: string;
  description?: string;
  kind?: string;
  weight?: number;
};

export function patchExamById(id: string, body: PatchExamBody): Promise<Exam> {
  return client<Exam>(`/exams/${id}`, { method: "PATCH", body });
}
