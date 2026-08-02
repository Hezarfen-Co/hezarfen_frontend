import { client } from "../client";
import type { DietaryProfile } from "../client";

export function getDietaryProfileByUserId(userId: string, signal?: AbortSignal): Promise<DietaryProfile> {
  return client<DietaryProfile>(`/meals/profiles/${encodeURIComponent(userId)}`, { signal });
}
