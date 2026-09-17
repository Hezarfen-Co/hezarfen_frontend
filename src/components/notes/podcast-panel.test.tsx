import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PodcastPanel } from "@/components/notes/podcast-panel";
import { PreferencesProvider } from "@/stores/preferences-context";

const podcastApi = vi.hoisted(() => ({
  postPodcastJob: vi.fn(),
  getPodcastJobById: vi.fn(),
  getPodcastJobResultById: vi.fn(),
  postPodcastJobCancel: vi.fn(),
  podcastAudioUrl: vi.fn((id: string) => `/api/podcast/audio?path=${encodeURIComponent(id)}`),
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
});
