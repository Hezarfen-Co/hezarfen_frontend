import { client } from "@/api/client";
import type { ProfileUpdate, User } from "@/api/types";

export function patchMe(body: ProfileUpdate): Promise<User> {
  return client<User>("/users/me", { method: "PATCH", body });
}
