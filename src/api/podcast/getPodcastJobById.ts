import { client } from "../client";
import type { PodcastJobStatus } from "../client";

/** One job's current state — the service's own snapshot. This is the poll door. */
export function getPodcastJobById(id: string, signal?: AbortSignal): Promise<PodcastJobStatus> {
  return client<PodcastJobStatus>(`/podcast/jobs/${encodeURIComponent(id)}`, { signal });
}
