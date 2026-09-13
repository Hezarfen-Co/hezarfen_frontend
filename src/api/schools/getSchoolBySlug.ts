import { client } from "../client";
import type { School } from "../client";

export function getSchoolBySlug(slug: string, signal?: AbortSignal): Promise<School> {
  return client<School>(`/schools/${encodeURIComponent(slug)}`, { signal });
}
