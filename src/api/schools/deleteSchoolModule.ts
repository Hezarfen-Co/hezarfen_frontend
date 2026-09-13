import { client } from "../client";
import type { SchoolModules } from "../client";

export function deleteSchoolModule(slug: string, module: string): Promise<SchoolModules> {
  return client<SchoolModules>(`/schools/${encodeURIComponent(slug)}/modules/${encodeURIComponent(module)}`, {
    method: "DELETE",
  });
}
