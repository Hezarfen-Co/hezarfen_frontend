import { client } from "./client";
import type { SchoolSettings } from "./types";

export function getSettings(signal?: AbortSignal): Promise<SchoolSettings> {
  return client<SchoolSettings>("/settings", { signal });
}
