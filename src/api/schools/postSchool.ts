import { client } from "../client";
import type { School } from "../client";

export type CreateSchoolBody = {
  name: string;
  admin_username: string;
  admin_password: string;
  /** Omitted sells the whole catalog. */
  modules?: string[];
};

export function postSchool(body: CreateSchoolBody): Promise<School> {
  return client<School>("/schools", { method: "POST", body });
}
