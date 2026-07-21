import { client } from "../client";
import type { WorkEntry } from "../client";

export function postWorkCheckOut(): Promise<WorkEntry> {
  return client<WorkEntry>("/work/check-out", { method: "POST" });
}
