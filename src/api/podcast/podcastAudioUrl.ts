/**
 * The streaming URL for one produced episode. Not a request — hand it to an
 * `<audio src>`: /api is same-origin, so the session cookie rides along on its
 * own, and the backend streams the file in chunks rather than buffering it.
 *
 * `jobId` is the `job_id` from `getPodcastJobResultById` (or from the submit
 * receipt): the backend resolves the episode from its own job row, scoped to
 * the caller's school, and never from a path the client supplies. A job that
 * is not `done` answers `409 not_ready`; a row whose blob is missing on this
 * host answers `409 audio_missing`; a job the caller does not own is a `404`.
 */
export function podcastAudioUrl(jobId: string): string {
  return `/api/podcast/jobs/${encodeURIComponent(jobId)}/audio`;
}
