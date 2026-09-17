import { client } from "../client";
import type { PodcastJobArtifacts } from "../client";

/**
 * A finished job's artifacts — above all the `audio_id` the audio door
 * streams. A job that has not finished yet is refused with 409 (`not_ready`),
 * which is a "poll again", not a failure; one the service never heard of is a
 * 404. Read it only once `getPodcastJobById` reports `done`.
 */
export function getPodcastJobResultById(id: string, signal?: AbortSignal): Promise<PodcastJobArtifacts> {
  return client<PodcastJobArtifacts>(`/podcast/jobs/${encodeURIComponent(id)}/result`, { signal });
}
