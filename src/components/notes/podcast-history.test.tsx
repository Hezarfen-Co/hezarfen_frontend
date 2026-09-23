import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PodcastHistory } from "@/components/notes/podcast-history";
import type { PodcastJobSummary } from "@/api/client";
import { PreferencesProvider } from "@/stores/preferences-context";

const podcastApi = vi.hoisted(() => ({
  listPodcastJobs: vi.fn(),
  podcastAudioUrl: vi.fn((jobId: string) => `/api/podcast/jobs/${encodeURIComponent(jobId)}/audio`),
  getPodcastJobAudioBlob: vi.fn(),
}));

vi.mock("@/api/podcast", () => podcastApi);

function page(items: PodcastJobSummary[], total = items.length, offset = 0) {
  return { items, total, limit: 10, offset };
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

  const renderHistory = (noteId?: string) =>
    render(() => (
      <PreferencesProvider>
        <PodcastHistory noteId={noteId} active />
      </PreferencesProvider>
    ));

  it("names rows by narration, selects the newest finished one and plays a picked row", async () => {
    podcastApi.listPodcastJobs.mockResolvedValue(
      page([job({ job_id: "job-2", format: "ogrenci_hoca" }), job({ job_id: "job-1" })]),
    );

    renderHistory("note-1");

    // Scoped to one note, the note's title is not repeated on every row.
    await waitFor(() => expect(screen.getAllByText("Öğrenci ve öğretmen").length).toBeGreaterThan(0));
    expect(screen.queryByText("Hücre")).toBeNull();
    expect(screen.getAllByText("12:34").length).toBeGreaterThan(0);
    // One player, on the newest finished episode, not playing on its own.
    expect(document.querySelectorAll("audio")).toHaveLength(1);
    expect(document.querySelector("audio")?.getAttribute("src")).toBe("/api/podcast/jobs/job-2/audio");

    fireEvent.click(screen.getByRole("button", { name: /^Bölümü oynat: Düz okuma/ }));

    await waitFor(() =>
      expect(document.querySelector("audio")?.getAttribute("src")).toBe("/api/podcast/jobs/job-1/audio"),
    );
    expect(document.querySelectorAll("audio")).toHaveLength(1);
  });

  it("gives a non-done row no play control", async () => {
    podcastApi.listPodcastJobs.mockResolvedValue(
      page([job({ state: "running", duration_secs: null, finished_at: null })]),
    );

    renderHistory("note-1");

    await waitFor(() => expect(screen.getByText("Hazırlanıyor")).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Bölümü oynat" })).toBeNull();
    expect(document.querySelector("audio")).toBeNull();
  });

  it("downloads a finished episode under the note's own title", async () => {
    podcastApi.listPodcastJobs.mockResolvedValue(page([job({})]));

    renderHistory("note-1");

    await waitFor(() => expect(screen.getAllByRole("link", { name: "Bölümü indir" }).length).toBeGreaterThan(0));
    for (const link of screen.getAllByRole("link", { name: "Bölümü indir" }) as HTMLAnchorElement[]) {
      expect(link.getAttribute("href")).toBe("/api/podcast/jobs/job-1/audio");
      expect(link.getAttribute("download")).toBe("Hücre.mp3");
    }
  });

  it("gives a non-done row no download control", async () => {
    podcastApi.listPodcastJobs.mockResolvedValue(
      page([job({ state: "running", duration_secs: null, finished_at: null })]),
    );

    renderHistory("note-1");

    await waitFor(() => expect(screen.getByText("Hazırlanıyor")).toBeTruthy());
    expect(screen.queryByRole("link", { name: "Bölümü indir" })).toBeNull();
  });

  it("asks the door about the selected note only", async () => {
    podcastApi.listPodcastJobs.mockResolvedValue(page([job({})]));

    renderHistory("note-1");

    await waitFor(() =>
      expect(podcastApi.listPodcastJobs).toHaveBeenCalledWith({ limit: 10, offset: 0, sourceId: "note-1" }),
    );
    expect(screen.queryByRole("button", { name: "Tümü" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Bu not" })).toBeNull();
  });

  it("does not offer a global history scope", async () => {
    podcastApi.listPodcastJobs.mockResolvedValue(page([job({})]));

    renderHistory("note-1");
    await waitFor(() => expect(podcastApi.listPodcastJobs).toHaveBeenCalledTimes(1));

    expect(podcastApi.listPodcastJobs).toHaveBeenLastCalledWith({ limit: 10, offset: 0, sourceId: "note-1" });
    expect(screen.queryByText("Tüm notlarınızdaki bölümler gösteriliyor.")).toBeNull();
  });

  it("tells an empty note apart from an empty history", async () => {
    podcastApi.listPodcastJobs.mockResolvedValue(page([]));

    renderHistory("note-1");
    await waitFor(() => expect(screen.getByText("Bu not için henüz bölüm yok")).toBeTruthy());
    expect(screen.queryByText("Henüz bölüm oluşturulmadı")).toBeNull();

    expect(screen.queryByText("Henüz bölüm oluşturulmadı")).toBeNull();
  });

  it("does not query a global history when no note is selected", async () => {
    podcastApi.listPodcastJobs.mockResolvedValue(page([]));

    renderHistory();

    await waitFor(() => expect(screen.getByText("Henüz bölüm oluşturulmadı")).toBeTruthy());
    expect(podcastApi.listPodcastJobs).not.toHaveBeenCalled();
  });

  it("falls back to the note id for a download when the note is gone", async () => {
    podcastApi.listPodcastJobs.mockResolvedValue(page([job({ source_id: "note-gone", source_title: null })]));

    renderHistory("note-1");

    await waitFor(() => expect(screen.getAllByRole("link", { name: "Bölümü indir" }).length).toBeGreaterThan(0));
    expect(screen.getAllByRole("link", { name: "Bölümü indir" })[0].getAttribute("download")).toBe("note-gone.mp3");
  });

  it("refetches when the panel signals a finished generation", async () => {
    podcastApi.listPodcastJobs.mockResolvedValue(page([]));
    const [key, setKey] = createSignal<string>("");

    render(() => (
      <PreferencesProvider>
        <PodcastHistory noteId="note-1" active refetchKey={key()} />
      </PreferencesProvider>
    ));

    await waitFor(() => expect(podcastApi.listPodcastJobs).toHaveBeenCalledTimes(1));
    setKey("job-2");
    await waitFor(() => expect(podcastApi.listPodcastJobs).toHaveBeenCalledTimes(2));
  });

  it("paginates the selected note's podcast history", async () => {
    const first = job({ job_id: "job-1", format: "duz_okuma" });
    const second = job({ job_id: "job-2", format: "tek_ogretici" });
    podcastApi.listPodcastJobs
      .mockResolvedValueOnce(page([first], 11, 0))
      .mockResolvedValueOnce(page([second], 11, 10));

    renderHistory("note-1");

    await waitFor(() => expect(screen.getAllByText("Düz okuma").length).toBeGreaterThan(0));
    expect(screen.getByText("1 / 2")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Sonraki" }));

    await waitFor(() => expect(screen.getAllByText("Tek öğretici").length).toBeGreaterThan(0));
    expect(podcastApi.listPodcastJobs).toHaveBeenLastCalledWith({ limit: 10, offset: 10, sourceId: "note-1" });
    expect(screen.getByText("2 / 2")).toBeTruthy();
  });

  it("marks each episode with the narration the service settled on", async () => {
    podcastApi.listPodcastJobs.mockResolvedValue(
      page([job({ job_id: "job-1", format: "duz_okuma" }), job({ job_id: "job-2", format: "ogrenci_hoca" })]),
    );

    renderHistory("note-1");

    await waitFor(() => expect(screen.getAllByText("Düz okuma").length).toBeGreaterThan(0));
    expect(screen.getAllByText("Öğrenci ve öğretmen").length).toBeGreaterThan(0);
  });

  it("names an episode the service has not settled a format for plainly", async () => {
    podcastApi.listPodcastJobs.mockResolvedValue(
      page([job({ state: "queued", format: null, duration_secs: null, finished_at: null })]),
    );

    renderHistory("note-1");

    await waitFor(() => expect(screen.getByText("Bölüm")).toBeTruthy());
    expect(screen.queryByText("Düz okuma")).toBeNull();
  });
});
