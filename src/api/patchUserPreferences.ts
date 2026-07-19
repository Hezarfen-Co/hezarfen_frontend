import { client } from "./client";
import type { User, UserLanguage, UserTheme } from "./types";

/** Omit to keep; empty string clears back to the device default. Null also
 * means keep on the backend, so it is deliberately not allowed here. */
export type PatchUserPreferencesBody = {
  theme?: UserTheme | "";
  language?: UserLanguage | "";
};

export function patchUserPreferences(id: string, body: PatchUserPreferencesBody): Promise<User> {
  return client<User>(`/users/${id}/preferences`, {
    method: "PATCH",
    body,
  });
}
