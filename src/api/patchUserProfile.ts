import { client } from "@/api/client";
import type { ProfileUpdate } from "@/api/types";

export async function patchUserProfile(id: string, body: ProfileUpdate): Promise<void> {
  await client(`/users/${encodeURIComponent(id)}/profile`, { method: "PATCH", body });
}
