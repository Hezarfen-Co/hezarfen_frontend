import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PodcastJobSummary, RagOutput } from "@/api/client";
import { StudioOutputLibrary } from "@/components/ai/studio-output-library";
import { PreferencesProvider } from "@/stores/preferences-context";

const podcastApi = vi.hoisted(() => ({ listPodcastJobs: vi.fn() }));
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
      podcast({ job_id: "job-failed", source_id: "note-3", state: "failed" }),
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

  it("shows only notes with finished outputs and selects one directly", async () => {
    const onSelect = vi.fn();

    render(() => (
      <PreferencesProvider>
        <StudioOutputLibrary notes={notes} selectedId="note-1" onSelect={onSelect} />
      </PreferencesProvider>
    ));

    await waitFor(() => expect(screen.getByText("Hücre")).toBeTruthy());
    expect(screen.getByText("Kuvvet")).toBeTruthy();
    expect(screen.queryByText("Polinomlar")).toBeNull();
    expect(screen.getByText("2 podcast")).toBeTruthy();
    expect(screen.getByText("Yapay zekâ özeti")).toBeTruthy();
    expect(screen.getByText("2 not")).toBeTruthy();

    const selected = screen.getByRole("button", { name: /Hücre/ });
    expect(selected.getAttribute("aria-current")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: /Kuvvet/ }));
    expect(onSelect).toHaveBeenCalledWith("note-2");
    expect(podcastApi.listPodcastJobs).toHaveBeenCalledWith({ limit: 100 });
    expect(courseNotesApi.getCourseNoteRag).toHaveBeenCalledTimes(3);
  });
});
