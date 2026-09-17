import { client } from "../client";
import type { KarneReport } from "../client";

/**
 * The caller's karne for one dönem. Omit `term` for the newest one. An
 * archived dönem serves the snapshot the school froze when it closed.
 */
export function getMyKarne(term?: string, signal?: AbortSignal): Promise<KarneReport> {
  const query = term ? `?term=${encodeURIComponent(term)}` : "";
  return client<KarneReport>(`/marks/karne${query}`, { signal });
}
