import { client } from "./client";
import type { User } from "./types";

export type RegisterBody = {
  username: string;
  password: string;
};

export function postRegister(body: RegisterBody): Promise<User> {
  return client<User>("/auth/register", { method: "POST", body });
}
