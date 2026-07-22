import { client } from "../client";
import type { Homework } from "../client";

export function getHomeworkById(id: string, signal?: AbortSignal): Promise<Homework> {
  return client<Homework>(`/homework/${id}`, { signal });
}
