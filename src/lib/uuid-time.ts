/**
 * The creation instant embedded in a UUIDv7 id (its first 48 bits are unix
 * milliseconds), or `null` for any other id.
 *
 * Only for ordering records the backend gives no date for — an exam that was
 * never scheduled still sorts by when it was created. Never shown as a date:
 * it says when the row was made, not when anything happened.
 */
export function uuidV7Ms(id: string): number | null {
  const match = /^([0-9a-f]{8})-([0-9a-f]{4})-7[0-9a-f]{3}-/i.exec(id);
  if (!match) return null;
  return Number.parseInt(match[1] + match[2], 16);
}
