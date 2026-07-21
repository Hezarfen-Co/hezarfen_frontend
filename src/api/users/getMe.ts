import { client } from "../client";
import type { User } from "../client";

export function getMe(signal?: AbortSignal): Promise<User> {
  return client<User>("/auth/me", { signal });
}
