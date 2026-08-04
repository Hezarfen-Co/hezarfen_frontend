import { client } from "../client";
import type { Profile } from "../client";

export function getMyProfile(signal?: AbortSignal): Promise<Profile> {
  return client<Profile>("/users/me/profile", { signal });
}
