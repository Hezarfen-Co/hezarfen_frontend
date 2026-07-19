import { client } from "./client";
import type { Subject } from "./types";

export function getSubjectById(id: string, signal?: AbortSignal): Promise<Subject> {
  return client<Subject>(`/subjects/${id}`, { signal });
}
