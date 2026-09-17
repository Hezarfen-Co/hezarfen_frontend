import { client } from "../client";
import type { PodcastFormat, PodcastJobReceipt } from "../client";

export type PostPodcastJobBody = {
  /** A course note's id, never a path — the backend resolves the source. */
  source_id: string;
  /**
   * Omit for the service's default (`duz_okuma`). `tek_ogretici` and
   * `ogrenci_hoca` need the service's LLM key and are refused with
   * 409 `llm_unavailable` without it.
   */
  format?: PodcastFormat;
};

/**
 * 202 the moment the service accepts the job — the pipeline then runs in its
 * own worker pool, so poll `getPodcastJobById` for progress. 503 when no
 * service offers the podcast capability, and then nothing was queued.
 */
export function postPodcastJob(body: PostPodcastJobBody): Promise<PodcastJobReceipt> {
  return client<PodcastJobReceipt>("/podcast/jobs", { method: "POST", body });
}
