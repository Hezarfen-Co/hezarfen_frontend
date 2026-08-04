import { client } from "../client";

// Admin-only moderation delete of someone else's avatar.
export function deleteUserAvatar(id: string): Promise<void> {
  return client<void>(`/users/${encodeURIComponent(id)}/avatar`, { method: "DELETE" });
}
