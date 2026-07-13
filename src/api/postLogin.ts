import { client } from "./client";
import type { User } from "./types";

export type LoginBody = {
  username: string;
  password: string;
};

export function postLogin(body: LoginBody): Promise<User> {
  return client<User>("/auth/login", { method: "POST", body });
}
