import { client } from "../client";
import type { ClassGroup } from "../client";

export function getClassById(id: string, signal?: AbortSignal): Promise<ClassGroup> {
  return client<ClassGroup>(`/classes/${id}`, { signal });
}
