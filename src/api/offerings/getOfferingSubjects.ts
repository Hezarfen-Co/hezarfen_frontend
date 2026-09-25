import { client } from "../client";
import type { Subject } from "../client";

// The topics every inheriting section at this grade teaches.
export function getOfferingSubjects(id: string, signal?: AbortSignal): Promise<Subject[]> {
  return client<Subject[]>(`/offerings/${id}/subjects`, { signal });
}
