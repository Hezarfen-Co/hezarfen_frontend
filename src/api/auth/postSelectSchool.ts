import { client } from "../client";
import type { User } from "../client";

export type SelectSchoolBody = {
  school: string;
};

export function postSelectSchool(body: SelectSchoolBody): Promise<User> {
  return client<User>("/auth/school", { method: "POST", body });
}
