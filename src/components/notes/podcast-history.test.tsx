import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PodcastHistory } from "@/components/notes/podcast-history";
import type { PodcastJobSummary } from "@/api/client";
import { PreferencesProvider } from "@/stores/preferences-context";

const podcastApi = vi.hoisted(() => ({
  listPodcastJobs: vi.fn(),
  podcastAudioUrl: vi.fn((jobId: string) => `/api/podcast/jobs/${encodeURIComponent(jobId)}/audio`),
}));

vi.mock("@/api/podcast", () => podcastApi);

function page(items: PodcastJobSummary[]) {
  return { items, total: items.length, limit: 10, offset: 0 };
}

function job(over: Partial<PodcastJobSummary>): PodcastJobSummary {
  return {
    job_id: "job-1",
    state: "done",
    format: "duz_okuma",
    source_id: "note-1",
    source_title: "Hücre",
    created_at: Date.UTC(2026, 0, 2),
    finished_at: Date.UTC(2026, 0, 2),
    duration_secs: 754,
    error_code: null,
    ...over,
  };
}

describe("PodcastHistory", () => {
  beforeEach(() => {
    // The panel's own test defaults to English; this one pins Turkish so the
    // exact labels the spec names are the ones asserted.
    localStorage.setItem("hezarfen.locale", "tr");
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  const renderHistory = () =>
    render(() => (
      <PreferencesProvider>
        <PodcastHistory active />
      </PreferencesProvider>
    ));

  it("renders a finished row's title, state and duration, and plays it by job id", async () => {
    podcastApi.listPodcastJobs.mockResolvedValue(page([job({})]));

    renderHistory();

    await waitFor(() => expect(screen.getByText("Hücre")).toBeTruthy());
    expect(screen.getByText("Hazır")).toBeTruthy();
    expect(screen.getByText("12:34")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Bölümü oynat" }));
    expect(podcastApi.podcastAudioUrl).toHaveBeenCalledWith("job-1");
    expect(document.querySelector("audio")?.getAttribute("src")).toBe("/api/podcast/jobs/job-1/audio");
  });

  it("gives a non-done row no play control", async () => {
    podcastApi.listPodcastJobs.mockResolvedValue(
      page([job({ state: "running", duration_secs: null, finished_at: null })]),
    );

    renderHistory();

    await waitFor(() => expect(screen.getByText("Hazırlanıyor")).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Bölümü oynat" })).toBeNull();
    expect(document.querySelector("audio")).toBeNull();
  });

  it("shows the empty state when the caller has no episodes", async () => {
    podcastApi.listPodcastJobs.mockResolvedValue(page([]));

    renderHistory();

    await waitFor(() => expect(screen.getByText("Henüz bölüm oluşturulmadı")).toBeTruthy());
  });

  it("falls back to the note id when the note is gone", async () => {
    podcastApi.listPodcastJobs.mockResolvedValue(page([job({ source_id: "note-gone", source_title: null })]));

    renderHistory();

    await waitFor(() => expect(screen.getByText("note-gone")).toBeTruthy());
  });

  it("refetches when the panel signals a finished generation", async () => {
    podcastApi.listPodcastJobs.mockResolvedValue(page([]));
    const [key, setKey] = createSignal<string>("");

    render(() => (
      <PreferencesProvider>
        <PodcastHistory active refetchKey={key()} />
      </PreferencesProvider>
    ));

    await waitFor(() => expect(podcastApi.listPodcastJobs).toHaveBeenCalledTimes(1));
    setKey("job-2");
    await waitFor(() => expect(podcastApi.listPodcastJobs).toHaveBeenCalledTimes(2));
  });
});
