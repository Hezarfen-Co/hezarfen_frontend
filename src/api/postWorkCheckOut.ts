import { client } from "./client";
import type { WorkEntry } from "./types";

export function postWorkCheckOut(): Promise<WorkEntry> {
  return client<WorkEntry>("/work/check-out", { method: "POST" });
}
