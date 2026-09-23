import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PodcastPlayer } from "@/components/notes/podcast-player";
import { transcriptChapters } from "@/components/notes/podcast-transcript";
import { PreferencesProvider } from "@/stores/preferences-context";

const getPodcastJobResultById = vi.hoisted(() => vi.fn());
vi.mock("@/api/podcast", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/podcast")>()),
  getPodcastJobResultById,
}));

describe("transcriptChapters", () => {
  it("splits the backend's text on blank lines", () => {
    expect(transcriptChapters("Hücre canlının en küçük birimidir.\n\n  Zarı seçici geçirgendir.\r\n\r\nÇekirdek\nbilgiyi taşır.")).toEqual([
      "Hücre canlının en küçük birimidir.",
      "Zarı seçici geçirgendir.",
      "Çekirdek\nbilgiyi taşır.",
    ]);
  });

  it("is empty for a missing or blank transcript", () => {
    expect(transcriptChapters(null)).toEqual([]);
    expect(transcriptChapters(undefined)).toEqual([]);
    expect(transcriptChapters(" \n\n ")).toEqual([]);
  });
});

describe("PodcastPlayer", () => {
  beforeEach(() => {
    localStorage.setItem("hezarfen.locale", "tr");
    // jsdom has no media pipeline; the player only needs these to not throw.
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    getPodcastJobResultById.mockResolvedValue({ job_id: "job 1", audio_id: "a.mp3", transcript: null });
    // Audio already buffered this far, so the seek needs no local copy.
    vi.spyOn(HTMLMediaElement.prototype, "buffered", "get").mockReturnValue({
      length: 1,
      start: () => 0,
      end: () => 754,
    } as unknown as TimeRanges);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const renderPlayer = () =>
    render(() => (
      <PreferencesProvider>
        <PodcastPlayer jobId="job 1" title="Hücre" durationSecs={754} />
      </PreferencesProvider>
    ));

  it("streams the job's audio door with its own controls, not the browser's", () => {
    const { container } = renderPlayer();

    const audio = container.querySelector("audio")!;
    expect(audio.getAttribute("src")).toBe("/api/podcast/jobs/job%201/audio");
    expect(audio.hasAttribute("controls")).toBe(false);
    expect(screen.getByRole("button", { name: "Oynat" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "15 saniye geri" })).toBeTruthy();
    expect(screen.getByRole("slider", { name: "Konum" })).toBeTruthy();
    // The server's running time stands in until metadata loads.
    expect(screen.getByText("12:34")).toBeTruthy();
  });

  it("cycles the playback speed and remembers it", async () => {
    renderPlayer();

    await fireEvent.click(screen.getByRole("button", { name: /Oynatma hızı/ }));

    expect(localStorage.getItem("hezarfen.audio.rate")).toBe("1.25");
  });

  it("offers no transcript control while the result carries none", async () => {
    renderPlayer();

    await vi.waitFor(() => expect(getPodcastJobResultById).toHaveBeenCalledWith("job 1", expect.any(AbortSignal)));
    expect(screen.queryByRole("button", { name: "Transkripti göster" })).toBeNull();
  });

  it("opens the job's transcript, one paragraph per chapter", async () => {
    getPodcastJobResultById.mockResolvedValue({
      job_id: "job 1",
      audio_id: "a.mp3",
      transcript: "Hücre canlının en küçük birimidir.\n\nZarı seçici geçirgendir.",
    });
    renderPlayer();

    await fireEvent.click(await screen.findByRole("button", { name: "Transkripti göster" }));

    const region = screen.getByRole("region", { name: "Transkript" });
    expect(region.querySelectorAll("p")).toHaveLength(2);
    expect(screen.getByText("Zarı seçici geçirgendir.")).toBeTruthy();
  });
});
