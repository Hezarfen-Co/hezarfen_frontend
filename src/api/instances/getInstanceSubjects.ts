import { client } from "../client";
import type { Subject } from "../client";

export type ResolvedSubjects = { subjects: Subject[]; subjects_inherited: boolean };

export function getInstanceSubjects(id: string, signal?: AbortSignal): Promise<ResolvedSubjects> {
  return client<ResolvedSubjects>(`/instances/${id}/subjects`, { signal });
}
