/**
 * The one record guard for payloads whose shape is only known at runtime —
 * ZEKA's insight JSON is stored and served unread, so every reader narrows it
 * field by field. Keep this canonical: a guard redefined per file drifts.
 */
export type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
