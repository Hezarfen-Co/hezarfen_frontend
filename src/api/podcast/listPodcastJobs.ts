import { client, pageQuery, type Page, type PageParams, type PodcastJobSummary } from "../client";

/**
 * The caller's own episodes, newest first — every job the backend ever minted
 * for this user, whatever state it stopped in. A reading door: it answers from
 * the rows alone, so it still lists the history with the service down.
 */
export function listPodcastJobs(params?: PageParams, signal?: AbortSignal): Promise<Page<PodcastJobSummary>> {
  return client<Page<PodcastJobSummary>>(`/podcast/jobs${pageQuery(params)}`, { signal });
}
