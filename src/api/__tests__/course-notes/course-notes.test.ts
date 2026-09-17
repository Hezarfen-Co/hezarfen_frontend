import { afterEach, describe, expect, it, vi } from "vitest";
import { getCourseNotes } from "../../course-notes";
import { postCourseNoteRagReindex } from "../../course-notes";
import { getCourseNoteById } from "../../course-notes";
import { postCourseNote } from "../../course-notes";
import { patchCourseNoteById } from "../../course-notes";
import { deleteCourseNoteById } from "../../course-notes";
import { getCourseNoteFiles } from "../../course-notes";
import { postCourseNoteFile } from "../../course-notes";
import { deleteCourseNoteFileById } from "../../course-notes";
import { getCourseNoteFileUrl } from "../../course-notes";
import { getCourseNoteFileBlob } from "../../course-notes";
import { getCourseNoteRag } from "../../course-notes";
import { deleteCourseNoteRagOutput } from "../../course-notes";
import { lastFetchCall, mockFetch204, mockFetchBlob, mockFetchSuccess } from "../helpers/mock-fetch";
describe("course notes API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getCourseNotes calls /course-notes with the required course filter", async () => {
    const mockPage = { items: [{ id: "cn1", course: "c1", title: "Note" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getCourseNotes("c1");
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/course-notes?course=c1");
    expect(init?.method).toBe("GET");
  });

  it("getCourseNotes keeps the course filter alongside pagination", async () => {
    mockFetchSuccess({ items: [], total: 0 });

    await getCourseNotes("c1", { limit: 10, offset: 20 });

    const [url] = lastFetchCall();
    expect(url).toBe("/api/course-notes?course=c1&limit=10&offset=20");
  });

  it("postCourseNote calls /course-notes with the course in the body", async () => {
    const mockNote = { id: "cn1", course: "c1", title: "Note", content: "Content" };
    mockFetchSuccess(mockNote);

    const data = { course: "c1", title: "Note", content: "Content" };
    const result = await postCourseNote(data);
    expect(result).toEqual(mockNote);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/course-notes");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(data));
  });

  it("getCourseNoteById calls /course-notes/:id", async () => {
    const mockNote = { id: "cn1", course: "c1", title: "Note", content: "Content" };
    mockFetchSuccess(mockNote);

    const result = await getCourseNoteById("cn1");
    expect(result).toEqual(mockNote);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/course-notes/cn1");
    expect(init?.method).toBe("GET");
  });

  it("patchCourseNoteById calls /course-notes/:id with updates", async () => {
    const mockNote = { id: "cn1", course: "c1", title: "Updated", content: "Content" };
    mockFetchSuccess(mockNote);

    const updates = { title: "Updated" };
    const result = await patchCourseNoteById("cn1", updates);
    expect(result).toEqual(mockNote);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/course-notes/cn1");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(updates));
  });

  it("deleteCourseNoteById calls /course-notes/:id", async () => {
    mockFetch204();

    await deleteCourseNoteById("cn1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/course-notes/cn1");
    expect(init?.method).toBe("DELETE");
  });

  it("getCourseNoteFiles calls /course-notes/:id/files with pagination", async () => {
    const mockPage = { items: [{ id: "f1", name: "test.pdf" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getCourseNoteFiles("cn1", { limit: 10 });
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/course-notes/cn1/files?limit=10");
    expect(init?.method).toBe("GET");
  });

  it("postCourseNoteFile calls /course-notes/:id/files with FormData", async () => {
    const mockFile = { id: "f1", name: "test.pdf", content_type: "application/pdf", size: 100 };
    mockFetchSuccess(mockFile);

    const file = new File(["test"], "test.pdf", { type: "application/pdf" });
    const result = await postCourseNoteFile("cn1", file);
    expect(result).toEqual(mockFile);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/course-notes/cn1/files");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
    expect((init?.body as FormData).get("file")).toBe(file);
  });

  it("deleteCourseNoteFileById calls /course-notes/:id/files/:fileId", async () => {
    mockFetch204();

    await deleteCourseNoteFileById("cn1", "f1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/course-notes/cn1/files/f1");
    expect(init?.method).toBe("DELETE");
  });

  it("getCourseNoteFileUrl returns correct URL path", () => {
    const url = getCourseNoteFileUrl("cn1", "f1");
    expect(url).toBe("/api/course-notes/cn1/files/f1");
  });

  it("getCourseNoteFileBlob fetches file blob", async () => {
    const blob = new Blob(["test"], { type: "application/pdf" });
    mockFetchBlob(blob);

    const result = await getCourseNoteFileBlob("cn1", "f1");
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe("application/pdf");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/course-notes/cn1/files/f1");
    expect(init?.credentials).toBe("same-origin");
  });

  it("getCourseNoteRag calls /course-notes/:id/rag with pagination", async () => {
    const mockPage = { items: [{ id: "r1", course_note: "cn1" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getCourseNoteRag("cn1", { limit: 10 });
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/course-notes/cn1/rag?limit=10");
    expect(init?.method).toBe("GET");
  });

  it("deleteCourseNoteRagOutput calls /course-notes/:id/rag/:outputId", async () => {
    mockFetch204();

    await deleteCourseNoteRagOutput("cn1", "r1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/course-notes/cn1/rag/r1");
    expect(init?.method).toBe("DELETE");
  });
  it("postCourseNoteRagReindex POSTs /course-notes/:id/rag/reindex", async () => {
    mockFetch204();

    await postCourseNoteRagReindex("n1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/course-notes/n1/rag/reindex");
    expect(init?.method).toBe("POST");
  });

});
