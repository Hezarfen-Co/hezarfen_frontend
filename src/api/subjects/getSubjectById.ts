import { client } from "../client";
import type { Subject } from "../client";

export function getSubjectById(subjectId: string, signal?: AbortSignal): Promise<Subject> {
  return client<Subject>(`/subjects/${subjectId}`, { signal });
}
