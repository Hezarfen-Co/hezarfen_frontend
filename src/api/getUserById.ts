import { client } from "@/api/client";
import type { User } from "@/api/types";

export async function getUserById(id: string, signal?: AbortSignal): Promise<User> {
  return client<User>(`/users/${encodeURIComponent(id)}`, { signal });
}
