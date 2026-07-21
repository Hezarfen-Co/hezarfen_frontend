import { afterEach, describe, expect, it, vi } from "vitest";
import { getNotes } from "../../getNotes";
import { postNote } from "../../postNote";
import { patchNoteById } from "../../patchNoteById";
import { deleteNoteById } from "../../deleteNoteById";
import { getNoteFiles } from "../../getNoteFiles";
import { postNoteFile } from "../../postNoteFile";
import { deleteNoteFileById } from "../../deleteNoteFileById";
import { getNoteFileUrl } from "../../getNoteFileUrl";
import { getNoteFileBlob } from "../../getNoteFileBlob";
import { lastFetchCall, mockFetch204, mockFetchBlob, mockFetchSuccess } from "../helpers/mock-fetch";

describe("notes API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getNotes calls /notes with pagination", async () => {
    const mockPage = { items: [{ id: "n1", title: "Note" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getNotes({ limit: 5 });
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/notes?limit=5");
    expect(init?.method).toBe("GET");
  });

  it("postNote calls /notes with data", async () => {
    const mockNote = { id: "n1", title: "Note", content: "Content" };
    mockFetchSuccess(mockNote);

    const data = { title: "Note", content: "Content" };
    const result = await postNote(data);
    expect(result).toEqual(mockNote);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/notes");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(data));
  });

  it("patchNoteById calls /notes/:id with updates", async () => {
    const mockNote = { id: "n1", title: "Updated", content: "Content" };
    mockFetchSuccess(mockNote);

    const updates = { title: "Updated" };
    const result = await patchNoteById("n1", updates);
    expect(result).toEqual(mockNote);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/notes/n1");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(updates));
  });

  it("deleteNoteById calls /notes/:id", async () => {
    mockFetch204();

    await deleteNoteById("n1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/notes/n1");
    expect(init?.method).toBe("DELETE");
  });

  it("getNoteFiles calls /notes/:id/files with pagination", async () => {
    const mockPage = { items: [{ id: "f1", name: "test.pdf" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getNoteFiles("n1", { limit: 10 });
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/notes/n1/files?limit=10");
    expect(init?.method).toBe("GET");
  });

  it("postNoteFile calls /notes/:id/files with FormData", async () => {
    const mockFile = { id: "f1", name: "test.pdf", content_type: "application/pdf", size: 100 };
    mockFetchSuccess(mockFile);

    const file = new File(["test"], "test.pdf", { type: "application/pdf" });
    const result = await postNoteFile("n1", file);
    expect(result).toEqual(mockFile);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/notes/n1/files");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
    expect((init?.body as FormData).get("file")).toBe(file);
  });

  it("deleteNoteFileById calls /notes/:id/files/:fileId", async () => {
    mockFetch204();

    await deleteNoteFileById("n1", "f1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/notes/n1/files/f1");
    expect(init?.method).toBe("DELETE");
  });

  it("getNoteFileUrl returns correct URL path", () => {
    const url = getNoteFileUrl("n1", "f1");
    expect(url).toBe("/api/notes/n1/files/f1");
  });

  it("getNoteFileBlob fetches file blob", async () => {
    const blob = new Blob(["test"], { type: "application/pdf" });
    mockFetchBlob(blob);

    const result = await getNoteFileBlob("n1", "f1");
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe("application/pdf");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/notes/n1/files/f1");
    expect(init?.credentials).toBe("same-origin");
  });
});
