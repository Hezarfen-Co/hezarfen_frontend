import { client } from "./client";
import type { Subject } from "./types";

export type PatchSubjectBody = {
  name?: string;
  description?: string;
};

export function patchSubjectById(subjectId: string, body: PatchSubjectBody): Promise<Subject> {
  return client<Subject>(`/subjects/${subjectId}`, { method: "PATCH", body });
}
