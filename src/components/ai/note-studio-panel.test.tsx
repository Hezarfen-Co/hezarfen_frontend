import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCachedStudioNotes, loadStudioNotes } from "@/components/ai/note-studio-panel";

const coursesApi = vi.hoisted(() => ({ getCourses: vi.fn() }));
const notesApi = vi.hoisted(() => ({ getCourseNotes: vi.fn() }));

vi.mock("@/api/courses", () => coursesApi);
vi.mock("@/api/course-notes", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/api/course-notes")>(),
  ...notesApi,
}));

describe("loadStudioNotes", () => {
  beforeEach(() => vi.clearAllMocks());
  it("limits concurrent course note requests and preserves course order", async () => {
    const courses = Array.from({ length: 10 }, (_, index) => ({
      id: `course-${index}`,
      title: `Course ${index}`,
      creator: { id: "teacher" },
    }));
    coursesApi.getCourses.mockResolvedValue({ items: courses });
    let active = 0;
    let peak = 0;
    notesApi.getCourseNotes.mockImplementation(async (courseId: string) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, courseId === "course-0" ? 5 : 0));
      active--;
      return { items: [{ id: `note-${courseId}`, title: courseId }] };
    });

    const notes = await loadStudioNotes();

    expect(coursesApi.getCourses).toHaveBeenCalledWith({ limit: 100 });
    expect(notesApi.getCourseNotes).toHaveBeenCalledTimes(10);
    expect(peak).toBe(4);
    expect(notes.map((note) => note.courseTitle)).toEqual(courses.map((course) => course.title));
  });

  it("reuses the completed course note list within a tab", async () => {
    coursesApi.getCourses.mockResolvedValue({ items: [] });
    const first = getCachedStudioNotes("cache-test-user");
    const second = getCachedStudioNotes("cache-test-user");

    expect(first).toBe(second);
    await first;
    await getCachedStudioNotes("cache-test-user");
    expect(coursesApi.getCourses).toHaveBeenCalledTimes(1);
  });
});
