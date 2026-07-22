import type { SchoolSettings } from "@/api/client";

export const DEFAULT_MAX_FILE_BYTES = 5 * 1024 * 1024;

export function maxUploadBytes(settings: SchoolSettings | null | undefined): number {
  return settings?.max_file_bytes ?? DEFAULT_MAX_FILE_BYTES;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
