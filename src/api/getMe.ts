import { client } from "./client";
import type { User } from "./types";

export function getMe(signal?: AbortSignal): Promise<User> {
  return client<User>("/auth/me", { signal });
}
