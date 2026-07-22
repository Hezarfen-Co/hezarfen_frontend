import { client } from "../client";
import type { User } from "../client";

export function getUserById(id: string, signal?: AbortSignal): Promise<User> {
  return client<User>(`/users/${id}`, { signal });
}
