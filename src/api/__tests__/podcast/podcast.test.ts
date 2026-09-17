import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getPodcastJobById,
  getPodcastJobResultById,
  podcastAudioUrl,
  postPodcastJob,
  postPodcastJobCancel,
} from "../../podcast";
import { lastFetchCall, mockFetchSuccess } from "../helpers/mock-fetch";

describe("podcast API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("postPodcastJob POSTs /podcast/jobs with the source and format", async () => {
    mockFetchSuccess({ job_id: "j1", state: "queued", eta_secs: 90 }, 202);

    const result = await postPodcastJob({ source_id: "cn1", format: "tek_ogretici" });
    expect(result.job_id).toBe("j1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/podcast/jobs");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ source_id: "cn1", format: "tek_ogretici" }));
  });

  it("postPodcastJob omits format so the service picks its default", async () => {
    mockFetchSuccess({ job_id: "j1", state: "queued", eta_secs: 90 }, 202);

    await postPodcastJob({ source_id: "cn1" });

    const [, init] = lastFetchCall();
    expect(init?.body).toBe(JSON.stringify({ source_id: "cn1" }));
  });

  it("getPodcastJobById GETs one job's state", async () => {
    mockFetchSuccess({ job_id: "j1", state: "running", stage: "tts", progress: 0.4 });

    const result = await getPodcastJobById("j1");
    expect(result.progress).toBe(0.4);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/podcast/jobs/j1");
    expect(init?.method).toBe("GET");
  });

  it("getPodcastJobResultById GETs the artifacts", async () => {
    mockFetchSuccess({
      job_id: "j1",
      audio_id: "ses/duz_okuma/j1/episode.mp3",
      audio_ids: ["ses/duz_okuma/j1/episode.mp3"],
      duration_secs: 312.5,
      script_id: "s1",
      script_ids: ["s1"],
      format: "duz_okuma",
    });

    const result = await getPodcastJobResultById("j1");
    expect(result.audio_id).toBe("ses/duz_okuma/j1/episode.mp3");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/podcast/jobs/j1/result");
    expect(init?.method).toBe("GET");
  });

  it("postPodcastJobCancel POSTs the cancel door and reports a no-op honestly", async () => {
    mockFetchSuccess({ job_id: "j1", cancelled: false });

    const result = await postPodcastJobCancel("j1");
    expect(result.cancelled).toBe(false);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/podcast/jobs/j1/cancel");
    expect(init?.method).toBe("POST");
  });

  it("job doors encode the job id", async () => {
    mockFetchSuccess({ job_id: "a b", state: "done", stage: "done", progress: 1 });

    await getPodcastJobById("a b");

    const [url] = lastFetchCall();
    expect(url).toBe("/api/podcast/jobs/a%20b");
  });

  it("podcastAudioUrl carries the artifact path as a query param, encoded", () => {
    expect(podcastAudioUrl("ses/duz_okuma/j1/episode.mp3")).toBe(
      "/api/podcast/audio?path=ses%2Fduz_okuma%2Fj1%2Fepisode.mp3",
    );
  });
});
