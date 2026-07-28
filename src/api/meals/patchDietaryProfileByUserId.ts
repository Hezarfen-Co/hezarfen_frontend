import { client } from "../client";
import type { DietaryProfile } from "../client";

export function patchDietaryProfileByUserId(
  userId: string,
  body: { tags?: string[]; note?: string | null },
): Promise<DietaryProfile> {
  return client<DietaryProfile>(`/meals/profiles/${encodeURIComponent(userId)}`, { method: "PATCH", body });
}
