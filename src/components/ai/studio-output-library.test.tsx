import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PodcastJobSummary, RagOutput } from "@/api/client";
import { StudioOutputLibrary } from "@/components/ai/studio-output-library";
import { PreferencesProvider } from "@/stores/preferences-context";

const podcastApi = vi.hoisted(() => ({
  listPodcastJobs: vi.fn(),
  podcastAudioUrl: vi.fn((jobId: string) => `/api/podcast/jobs/${encodeURIComponent(jobId)}/audio`),
}));
const courseNotesApi = vi.hoisted(() => ({ getCourseNoteRag: vi.fn() }));

vi.mock("@/api/podcast", () => podcastApi);
vi.mock("@/api/course-notes", () => courseNotesApi);

const notes = [
  { id: "note-1", title: "Hücre", courseTitle: "Biyoloji" },
  { id: "note-2", title: "Kuvvet", courseTitle: "Fizik" },
  { id: "note-3", title: "Polinomlar", courseTitle: "Matematik" },
];

function page<T>(items: T[]) {
  return { items, total: items.length, limit: 100, offset: 0 };
}

function podcast(over: Partial<PodcastJobSummary>): PodcastJobSummary {
  return {
    job_id: "job-1",
    state: "done",
    format: "duz_okuma",
    source_id: "note-1",
    source_title: "Hücre",
    created_at: Date.UTC(2026, 0, 2),
    finished_at: Date.UTC(2026, 0, 2),
    duration_secs: 120,
    error_code: null,
    ...over,
  };
}

function summary(noteId: string): RagOutput {
  return {
    id: `rag-${noteId}`,
    course_note: noteId,
    course: "course-1",
    sources: [],
    payload: { summary: "Hazır" },
    generated_at: Date.UTC(2026, 0, 3),
  };
}

describe("StudioOutputLibrary", () => {
  let visible: ((noteId: string) => void) | undefined;
  beforeEach(() => {
    const observed = new Map<Element, { callback: IntersectionObserverCallback; observer: IntersectionObserver }>();
    visible = (noteId) => {
      for (const [target, entry] of observed) {
        if (noteId === "__sentinel" ? (target as HTMLElement).classList.contains("h-px") : (target as HTMLElement).dataset.noteId === noteId) {
          entry.callback([{ target, isIntersecting: true } as IntersectionObserverEntry], entry.observer);
          return;
        }
      }
    };
    vi.stubGlobal("IntersectionObserver", class {
      private callback: IntersectionObserverCallback;
      constructor(callback: IntersectionObserverCallback) { this.callback = callback; }
      observe(element: Element) { observed.set(element, { callback: this.callback, observer: this as unknown as IntersectionObserver }); }
      unobserve(element: Element) { observed.delete(element); }
      disconnect() { for (const [element, entry] of observed) if (entry.observer === this) observed.delete(element); }
    });
    localStorage.setItem("hezarfen.locale", "tr");
    podcastApi.listPodcastJobs.mockResolvedValue(page([
      podcast({ job_id: "job-1" }),
      podcast({ job_id: "job-2" }),
      podcast({ job_id: "job-failed", source_id: "note-3", source_title: "Polinomlar", state: "failed", error_code: "tts_failed" }),
    ]));
    courseNotesApi.getCourseNoteRag.mockImplementation(async (noteId: string) =>
      page(noteId === "note-2" ? [summary(noteId)] : []),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    localStorage.clear();
    vi.clearAllMocks();
  });

  const renderLibrary = (onSelect = vi.fn()) => {
    render(() => (
      <PreferencesProvider>
        <StudioOutputLibrary notes={notes} selectedId="note-1" onSelect={onSelect} />
      </PreferencesProvider>
    ));
    return onSelect;
  };

  it("lists one row per produced artifact, newest first, failures included", async () => {
    renderLibrary();

    await waitFor(() => expect(screen.getByText("Başarısız")).toBeTruthy());
    expect(courseNotesApi.getCourseNoteRag).not.toHaveBeenCalled();
    visible?.("note-1");
    visible?.("note-2");
    visible?.("note-3");
    await waitFor(() => expect(screen.getByText("Kuvvet")).toBeTruthy());
    await waitFor(() => expect(screen.getAllByText("Hücre").length).toBe(2));
    // The failed run is part of the history and says so rather than vanishing.
    expect(screen.getByText("Polinomlar")).toBeTruthy();
    expect(screen.getByText("Başarısız")).toBeTruthy();
    expect(screen.getByText("Kuvvet")).toBeTruthy();
    expect(screen.getByText("4 çıktı")).toBeTruthy();

    expect(podcastApi.listPodcastJobs).toHaveBeenCalledWith({ limit: 100 });
    expect(courseNotesApi.getCourseNoteRag).toHaveBeenCalledTimes(3);
  });

  it("marks every row of the selected note as current", async () => {
    renderLibrary();

    await waitFor(() => expect(screen.getAllByText("Hücre").length).toBe(3));
    visible?.("note-1");
    await waitFor(() => expect(screen.getAllByText("Hücre").length).toBe(2));
    const current = screen.getAllByRole("button").filter((el) => el.getAttribute("aria-current") === "true");
    expect(current.length).toBe(2);
  });

  it("pages a long history twenty rows at a time", async () => {
    podcastApi.listPodcastJobs.mockResolvedValue(page(
      Array.from({ length: 52 }, (_, index) =>
        podcast({ job_id: `job-${index}`, source_title: `Bölüm ${index + 1}`, source_id: `other-${index}`, created_at: Date.UTC(2026, 0, 1, index), finished_at: Date.UTC(2026, 0, 1, index) }),
      ),
    ));
    courseNotesApi.getCourseNoteRag.mockResolvedValue(page([]));
    renderLibrary();

    // Newest first: episode 52 leads, episode 33 closes the first page.
    await waitFor(() => expect(screen.getByText("Bölüm 52")).toBeTruthy());
    expect(screen.getByText("Bölüm 33")).toBeTruthy();
    expect(screen.queryByText("Bölüm 32")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Next|Sonraki/ }));
    expect(screen.getByText("Bölüm 32")).toBeTruthy();
    expect(screen.queryByText("Bölüm 52")).toBeNull();
  });

  it("opens an episode's note page with that episode picked", async () => {
    const onSelect = renderLibrary();

    await waitFor(() => expect(screen.getAllByText("Hücre").length).toBe(3));
    fireEvent.click(screen.getAllByRole("button", { name: /Hücre/ })[0]!);

    expect(onSelect).toHaveBeenCalledWith("note-1", expect.any(String));
  });

  it("opens the note for a summary row, which has no artifact of its own", async () => {
    const onSelect = renderLibrary();

    await waitFor(() => expect(screen.getByText("Kuvvet")).toBeTruthy());
    visible?.("note-2");
    await waitFor(() => expect(screen.getByText("Yapay zekâ özeti")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /Kuvvet/ }));

    expect(onSelect).toHaveBeenCalledWith("note-2", undefined);
  });

  it("loads only a visible note and keeps its unknown output as a placeholder", async () => {
    renderLibrary();
    await waitFor(() => expect(screen.getByText("Başarısız")).toBeTruthy());
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(courseNotesApi.getCourseNoteRag).not.toHaveBeenCalled();

    visible?.("note-2");
    await waitFor(() => expect(courseNotesApi.getCourseNoteRag).toHaveBeenCalledWith("note-2", { limit: 1 }));
    expect(courseNotesApi.getCourseNoteRag).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText("Yapay zekâ özeti")).toBeTruthy());
  });
});
