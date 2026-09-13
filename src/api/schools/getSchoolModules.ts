import { client } from "../client";
import type { SchoolModules } from "../client";

export function getSchoolModules(slug: string, signal?: AbortSignal): Promise<SchoolModules> {
  return client<SchoolModules>(`/schools/${encodeURIComponent(slug)}/modules`, { signal });
}
