import { client } from "../client";
import type { CreateUserInput, User } from "../client";

export function postUser(body: CreateUserInput): Promise<User> {
  return client<User>("/users", { method: "POST", body });
}
