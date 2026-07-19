import { client } from "./client";
import type { User, UserLanguage, UserTheme } from "./types";

export type PatchUserPreferencesBody = {
  theme?: UserTheme | null;
  language?: UserLanguage | null;
};

export function patchUserPreferences(id: string, body: PatchUserPreferencesBody): Promise<User> {
  return client<User>(`/users/${id}/preferences`, {
    method: "PATCH",
    body,
  });
}
