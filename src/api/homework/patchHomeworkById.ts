import { client } from "../client";
import type { Homework } from "../client";

export type PatchHomeworkBody = {
  title?: string;
  description?: string | null;
  due_at?: number;
  subject_id?: string;
  assigned?: string[] | null;
};

export function patchHomeworkById(id: string, body: PatchHomeworkBody): Promise<Homework> {
  return client<Homework>(`/homework/${id}`, { method: "PATCH", body });
}
