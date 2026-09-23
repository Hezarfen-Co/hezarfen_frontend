import { blobClient } from "../client";

/**
 * The whole produced episode as one Blob. The audio door streams chunked with
 * no length and ignores `Range`, so a browser cannot seek on the stream; the
 * player loads this once and seeks inside a local object URL instead.
 */
export function getPodcastJobAudioBlob(jobId: string, signal?: AbortSignal): Promise<Blob> {
  return blobClient(`/podcast/jobs/${encodeURIComponent(jobId)}/audio`, signal);
}
