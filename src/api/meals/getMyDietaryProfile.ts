import { client } from "../client";
import type { DietaryProfile } from "../client";

export function getMyDietaryProfile(signal?: AbortSignal): Promise<DietaryProfile> {
  return client<DietaryProfile>("/meals/profiles/me", { signal });
}
