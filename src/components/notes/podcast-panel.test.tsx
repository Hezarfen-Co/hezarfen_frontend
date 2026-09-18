import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PodcastPanel } from "@/components/notes/podcast-panel";
import { PreferencesProvider } from "@/stores/preferences-context";

const podcastApi = vi.hoisted(() => ({
  postPodcastJob: vi.fn(),
  getPodcastJobById: vi.fn(),
  getPodcastJobResultById: vi.fn(),
  postPodcastJobCancel: vi.fn(),
  podcastAudioUrl: vi.fn((jobId: string) => `/api/podcast/jobs/${encodeURIComponent(jobId)}/audio`),
}));

vi.mock("@/api/podcast", () => podcastApi);

// The panel asks what the AI tier allows as soon as it mounts; without this the
// real client reaches for a relative URL node's fetch cannot parse.
const aiApi = vi.hoisted(() => ({
  getAiCapabilities: vi.fn(async () => ({
    enabled: true,
    protocol: "hezarfen.ai.v1",
    capabilities: [{ capability: "podcast.submit", workers: 1, inflight: 0 }],
  })),
}));

vi.mock("@/api/ai", () => aiApi);

describe("PodcastPanel", () => {
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("submits the selected lesson note and narration format", async () => {
    podcastApi.postPodcastJob.mockResolvedValue({ job_id: "j1", state: "queued", eta_secs: 30 });

    render(() => (
      <PreferencesProvider>
        <PodcastPanel noteId="note-7" />
      </PreferencesProvider>
    ));

    fireEvent.change(screen.getByLabelText("Narration style"), { target: { value: "tek_ogretici" } });
    fireEvent.click(screen.getByRole("button", { name: "Create podcast" }));

    await waitFor(() => {
      expect(podcastApi.postPodcastJob).toHaveBeenCalledWith({ source_id: "note-7", format: "tek_ogretici" });
    });
    expect(sessionStorage.getItem("hezarfen.podcast.note-7")).toBe("j1");
    expect(screen.getByText("Waiting in queue")).toBeTruthy();
  });

  it("points the audio element at the job's audio door, not the artifact path", async () => {
    // A finished job restored from sessionStorage: the panel must address the
    // stream by `job_id`. Handing it `audio_id` (the output-root path) composes
    // a URL the backend has no route for, and the player dies silently.
    sessionStorage.setItem("hezarfen.podcast.note-7", "pj1");
    podcastApi.getPodcastJobById.mockResolvedValue({ job_id: "pj1", state: "done", stage: "done", progress: 1 });
    podcastApi.getPodcastJobResultById.mockResolvedValue({
      job_id: "pj1",
      audio_id: "ses/duz_okuma/pj1/episode.mp3",
      audio_ids: ["ses/duz_okuma/pj1/episode.mp3"],
      duration_secs: 42,
      script_id: "s1",
      script_ids: ["s1"],
      format: "duz_okuma",
    });

    render(() => (
      <PreferencesProvider>
        <PodcastPanel noteId="note-7" />
      </PreferencesProvider>
    ));

    await waitFor(() => {
      expect(screen.getByText("Your episode is ready.")).toBeTruthy();
    });
    expect(podcastApi.podcastAudioUrl).toHaveBeenCalledWith("pj1");
    expect(document.querySelector("audio")?.getAttribute("src")).toBe("/api/podcast/jobs/pj1/audio");
  });
});
