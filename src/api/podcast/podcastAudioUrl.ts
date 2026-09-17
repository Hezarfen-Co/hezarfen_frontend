/**
 * The streaming URL for one produced episode. Not a request — hand it to an
 * `<audio src>`: /api is same-origin, so the session cookie rides along on its
 * own, and the backend streams the file in chunks rather than buffering it.
 *
 * `audioId` is the `audio_id` from `getPodcastJobResultById`, resolved under
 * the caller's own school output directory. The backend treats the path as
 * hostile input and 400s anything that escapes that directory, so pass the
 * artifact through untouched instead of composing a path here.
 */
export function podcastAudioUrl(audioId: string): string {
  return `/api/podcast/audio?path=${encodeURIComponent(audioId)}`;
}
