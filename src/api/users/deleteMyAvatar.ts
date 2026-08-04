import { client } from "../client";

export function deleteMyAvatar(): Promise<void> {
  return client<void>("/users/me/avatar", { method: "DELETE" });
}
