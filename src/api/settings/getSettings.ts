import { client } from "../client";
import type { SchoolSettings } from "../client";

let cachedSettings: SchoolSettings | null = null;
let pendingSettings: Promise<SchoolSettings> | null = null;

export function getSettings(signal?: AbortSignal): Promise<SchoolSettings> {
  if (cachedSettings) return Promise.resolve(cachedSettings);
  if (pendingSettings) return pendingSettings;
  pendingSettings = client<SchoolSettings>("/settings", { signal })
    .then((settings) => {
      cachedSettings = settings;
      return settings;
    })
    .finally(() => {
      pendingSettings = null;
    });
  return pendingSettings;
}

export function setCachedSettings(settings: SchoolSettings): void {
  cachedSettings = settings;
  pendingSettings = null;
}
