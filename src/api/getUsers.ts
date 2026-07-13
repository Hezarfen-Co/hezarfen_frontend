import { client } from "./client";
import type { User } from "./types";

export function getUsers(signal?: AbortSignal): Promise<User[]> {
  return client<User[]>("/users", { signal });
}
