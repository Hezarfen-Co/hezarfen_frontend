import { client } from "../client";
import type { KarneReport } from "../client";

/**
 * Another user's karne. Requires teacher+, or a parent tied to the student.
 * An exactly-teacher caller sees only the lines of the instances they run,
 * with the average recomputed over those and no verdict.
 */
export function getUserKarne(userId: string, term?: string, signal?: AbortSignal): Promise<KarneReport> {
  const query = term ? `?term=${encodeURIComponent(term)}` : "";
  return client<KarneReport>(`/marks/karne/${userId}${query}`, { signal });
}
