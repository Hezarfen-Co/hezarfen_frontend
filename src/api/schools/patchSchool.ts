import { client } from "../client";
import type { School, SchoolStatus } from "../client";

export type UpdateSchoolBody = {
  name?: string;
  status?: SchoolStatus;
};

export function patchSchool(id: string, body: UpdateSchoolBody): Promise<School> {
  return client<School>(`/schools/${encodeURIComponent(id)}`, { method: "PATCH", body });
}
