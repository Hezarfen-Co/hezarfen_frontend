import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PodcastTranscriptSegment } from "@/api/client";
import { PodcastPlayer } from "@/components/notes/podcast-player";
import { activeSegmentIndex } from "@/components/notes/podcast-transcript";
import { PreferencesProvider } from "@/stores/preferences-context";

const segments: PodcastTranscriptSegment[] = [
  { start_secs: 0, end_secs: 4, text: "Hücre canlının en küçük birimidir.", speaker: null },
  { start_secs: 4, end_secs: 9, text: "Zarı seçici geçirgendir.", speaker: null },
  { start_secs: 9, end_secs: 15, text: "Çekirdek genetik bilgiyi taşır.", speaker: null },
];

describe("activeSegmentIndex", () => {
  it("finds the line being spoken", () => {
    expect(activeSegmentIndex(segments, 0)).toBe(0);
    expect(activeSegmentIndex(segments, 5.2)).toBe(1);
    expect(activeSegmentIndex(segments, 9)).toBe(2);
    expect(activeSegmentIndex(segments, 99)).toBe(2);
  });

  it("is -1 before the first line and on an empty transcript", () => {
    expect(activeSegmentIndex([{ ...segments[0], start_secs: 2 }], 1)).toBe(-1);
    expect(activeSegmentIndex([], 3)).toBe(-1);
  });
});

describe("PodcastPlayer", () => {
  beforeEach(() => {
    localStorage.setItem("hezarfen.locale", "tr");
    // jsdom has no media pipeline; the player only needs these to not throw.
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    // Nor element scrolling, which the transcript's follow uses.
    Element.prototype.scrollTo ??= () => {};
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const renderPlayer = (transcript?: PodcastTranscriptSegment[] | null) =>
    render(() => (
      <PreferencesProvider>
        <PodcastPlayer jobId="job 1" title="Hücre" durationSecs={754} transcript={transcript} />
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

  it("offers no transcript control while the backend sends none", () => {
    renderPlayer(null);

    expect(screen.queryByRole("button", { name: "Transkripti göster" })).toBeNull();
  });

  it("opens the transcript and plays from a clicked line", async () => {
    const { container } = renderPlayer(segments);

    await fireEvent.click(screen.getByRole("button", { name: "Transkripti göster" }));
    expect(screen.getByText("Zarı seçici geçirgendir.")).toBeTruthy();

    await fireEvent.click(screen.getByRole("button", { name: "00:04 konumundan dinle" }));

    expect(container.querySelector("audio")!.currentTime).toBe(4);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });
});
