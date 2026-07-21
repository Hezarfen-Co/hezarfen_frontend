import { client } from "../client";

export function postLogout(): Promise<void> {
  return client<void>("/auth/logout", { method: "POST" });
}
