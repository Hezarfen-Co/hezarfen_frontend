import { client } from "../client";
import type { SchoolModules } from "../client";

export function getSchoolModules(id: string, signal?: AbortSignal): Promise<SchoolModules> {
  return client<SchoolModules>(`/schools/${encodeURIComponent(id)}/modules`, { signal });
}
