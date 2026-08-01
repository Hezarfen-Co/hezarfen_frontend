import { client } from "../client";
import type { User, UserLanguage, UserTheme } from "../client";

export type PatchMyPreferencesBody = {
  theme?: UserTheme;
  language?: UserLanguage;
  // Accent color: "#rrggbb" to set, "" to clear back to null, omit to keep.
  palette_color?: string;
};

export function patchMyPreferences(body: PatchMyPreferencesBody): Promise<User> {
  return client<User>("/users/me/preferences", { method: "PATCH", body });
}
