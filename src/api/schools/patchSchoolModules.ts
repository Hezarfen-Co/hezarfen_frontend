import { client } from "../client";
import type { SchoolModules } from "../client";

export type PatchSchoolModulesBody = {
  enable?: string[];
  disable?: string[];
  enable_packages?: string[];
  disable_packages?: string[];
};

// One atomic re-sell: a 409 names every broken dependency and nothing is written.
export function patchSchoolModules(id: string, body: PatchSchoolModulesBody): Promise<SchoolModules> {
  return client<SchoolModules>(`/schools/${encodeURIComponent(id)}/modules`, { method: "PATCH", body });
}
