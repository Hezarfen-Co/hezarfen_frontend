import { client } from "./client";
import type { WorkEntry } from "./types";

export function getMyWorkLog(signal?: AbortSignal): Promise<WorkEntry[]> {
  return client<WorkEntry[]>("/work/me", { signal });
}
