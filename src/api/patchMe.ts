import { client } from "@/api/client";
import type { ProfileUpdate } from "@/api/types";

export async function patchMe(body: ProfileUpdate): Promise<void> {
  await client("/auth/me", { method: "PATCH", body });
}
