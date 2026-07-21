import { client } from "../client";
import type { User, UserLanguage, UserTheme } from "../client";

export type PatchMyPreferencesBody = {
  theme?: UserTheme;
  language?: UserLanguage;
};

export function patchMyPreferences(body: PatchMyPreferencesBody): Promise<User> {
  return client<User>("/users/me/preferences", { method: "PATCH", body });
}
