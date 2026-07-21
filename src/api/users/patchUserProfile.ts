import { client } from "@/api/client";
import type { ProfileUpdate, User } from "@/api/client";

export function patchUserProfile(id: string, body: ProfileUpdate): Promise<User> {
  return client<User>(`/users/${id}/profile`, { method: "PATCH", body });
}
