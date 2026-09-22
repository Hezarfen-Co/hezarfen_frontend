import { client } from "../client";
import type { School } from "../client";

export function getSchool(id: string, signal?: AbortSignal): Promise<School> {
  return client<School>(`/schools/${encodeURIComponent(id)}`, { signal });
}
