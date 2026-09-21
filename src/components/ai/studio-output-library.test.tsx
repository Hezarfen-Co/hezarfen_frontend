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
  beforeEach(() => {
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

    await waitFor(() => expect(screen.getAllByText("Hücre").length).toBe(2));
    const current = screen.getAllByRole("button").filter((el) => el.getAttribute("aria-current") === "true");
    expect(current.length).toBe(2);
  });

  it("pages a long history ten rows at a time", async () => {
    podcastApi.listPodcastJobs.mockResolvedValue(page(
      Array.from({ length: 12 }, (_, index) =>
        podcast({ job_id: `job-${index}`, source_title: `Bölüm ${index + 1}`, source_id: `other-${index}`, created_at: Date.UTC(2026, 0, 1, index), finished_at: Date.UTC(2026, 0, 1, index) }),
      ),
    ));
    courseNotesApi.getCourseNoteRag.mockResolvedValue(page([]));
    renderLibrary();

    // Newest first: episode 12 leads page one, episode 2 closes it.
    await waitFor(() => expect(screen.getByText("Bölüm 12")).toBeTruthy());
    expect(screen.getByText("Bölüm 3")).toBeTruthy();
    expect(screen.queryByText("Bölüm 2")).toBeNull();
    expect(screen.getByText("1-10 / 12")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Sonraki" }));
    expect(screen.getByText("Bölüm 2")).toBeTruthy();
    expect(screen.getByText("Bölüm 1")).toBeTruthy();
    expect(screen.queryByText("Bölüm 12")).toBeNull();
  });

  it("opens the run inspector for an episode instead of selecting its note", async () => {
    const onSelect = renderLibrary();

    await waitFor(() => expect(screen.getAllByText("Hücre").length).toBe(2));
    fireEvent.click(screen.getAllByRole("button", { name: /Hücre/ })[0]!);

    await waitFor(() => expect(screen.getByText("Üretim ayrıntısı")).toBeTruthy());
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("opens the note for a summary row, which has no artifact of its own", async () => {
    const onSelect = renderLibrary();

    await waitFor(() => expect(screen.getByText("Kuvvet")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /Kuvvet/ }));

    expect(onSelect).toHaveBeenCalledWith("note-2");
    expect(screen.queryByText("Üretim ayrıntısı")).toBeNull();
  });
});
