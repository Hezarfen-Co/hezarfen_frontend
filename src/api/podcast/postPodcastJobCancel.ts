import { client } from "../client";
import type { PodcastCancelVerdict } from "../client";

/**
 * Cancel one job. `cancelled: false` says this call stopped nothing — the job
 * had already finished or had already been cancelled — and is not an error, so
 * it must not be surfaced as one.
 */
export function postPodcastJobCancel(id: string): Promise<PodcastCancelVerdict> {
  return client<PodcastCancelVerdict>(`/podcast/jobs/${encodeURIComponent(id)}/cancel`, { method: "POST" });
}
