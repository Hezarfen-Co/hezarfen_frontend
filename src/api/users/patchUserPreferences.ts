import { client } from "../client";
import type { PatchMyPreferencesBody } from "./patchMyPreferences";
import type { User } from "../client";

export function patchUserPreferences(id: string, body: PatchMyPreferencesBody): Promise<User> {
  return client<User>(`/users/${id}/preferences`, { method: "PATCH", body });
}
