import { client } from "../client";
import type { SchoolModules } from "../client";

export function postSchoolModule(id: string, module: string): Promise<SchoolModules> {
  return client<SchoolModules>(`/schools/${encodeURIComponent(id)}/modules/${encodeURIComponent(module)}`, {
    method: "POST",
  });
}
