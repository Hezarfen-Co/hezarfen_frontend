import { client } from "../client";
import type { Profile } from "../client";

// Any authenticated account may read any profile, except a parent, who reaches
// only their own and their linked students' (403 otherwise).
export function getUserProfile(id: string, signal?: AbortSignal): Promise<Profile> {
  return client<Profile>(`/users/${encodeURIComponent(id)}/profile`, { signal });
}
