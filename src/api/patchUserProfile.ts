import { client } from "@/api/client";
import type { ProfileUpdate, User } from "@/api/types";

export function patchUserProfile(id: string, body: ProfileUpdate): Promise<User> {
  return client<User>(`/users/${encodeURIComponent(id)}/profile`, { method: "PATCH", body });
}
