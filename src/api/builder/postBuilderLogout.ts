import { client } from "../client";

export function postBuilderLogout(): Promise<void> {
  return client<void>("/builder/logout", { method: "POST" });
}
