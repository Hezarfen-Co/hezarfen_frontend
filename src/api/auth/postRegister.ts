import { client } from "../client";
import type { Role } from "../client";

export type RegisterBody = {
  school: string;
  username: string;
  password: string;
};

/** Backend answers 201 {username, role} only — anti-enumeration, no id. */
export type RegisterResponse = {
  username: string;
  role: Role;
};

export function postRegister(body: RegisterBody): Promise<RegisterResponse> {
  return client<RegisterResponse>("/auth/register", { method: "POST", body });
}
