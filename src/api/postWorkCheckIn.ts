import { client } from "./client";
import type { WorkEntry } from "./types";

export function postWorkCheckIn(): Promise<WorkEntry> {
  return client<WorkEntry>("/work/check-in", { method: "POST" });
}
