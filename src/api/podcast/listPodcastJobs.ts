import { client, pageQuery, type Page, type PageParams, type PodcastJobSummary } from "../client";

/**
 * A history call, optionally narrowed to one course note. `sourceId` is the
 * note the studio panel is open on; leaving it out asks for the whole history,
 * which is what the section's "All" scope does.
 */
export type PodcastJobListParams = PageParams & { sourceId?: string };

/**
 * The caller's own episodes, newest first — every job the backend ever minted
 * for this user, whatever state it stopped in. A reading door: it answers from
 * the rows alone, so it still lists the history with the service down.
 */
export function listPodcastJobs(params?: PodcastJobListParams, signal?: AbortSignal): Promise<Page<PodcastJobSummary>> {
  const { sourceId, ...page } = params ?? {};
  const query = pageQuery(page);
  // Absent drops the key and asks for the whole history; an empty value never
  // reaches the door, since the API 400s on a present-but-empty query param.
  const scope = sourceId ? `${query ? "&" : "?"}source_id=${encodeURIComponent(sourceId)}` : "";
  return client<Page<PodcastJobSummary>>(`/podcast/jobs${query}${scope}`, { signal });
}
