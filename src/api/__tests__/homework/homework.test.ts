import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deleteHomeworkById,
  deleteHomeworkResultByUserId,
  deleteHomeworkSubmission,
  deleteHomeworkSubmissionFile,
  getHomework,
  getHomeworkById,
  getHomeworkReport,
  getHomeworkRosterSubmissionFileUrl,
  getHomeworkResult,
  getHomeworkSubmission,
  getHomeworkSubmissionFileBlob,
  getHomeworkSubmissionFileUrl,
  getHomeworkSubmissions,
  patchHomeworkById,
  postHomeworkResult,
  postHomeworkSubmission,
  postHomeworkSubmissionFile,
} from "../../homework";
import { lastFetchCall, mockFetch204, mockFetchBlob, mockFetchSuccess } from "../helpers/mock-fetch";

describe("homework API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getHomework calls /homework with pagination", async () => {
    const mockPage = { items: [{ id: "hw1" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getHomework({ limit: 10, offset: 5 });
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/homework?limit=10&offset=5");
    expect(init?.method).toBe("GET");
  });

  it("getHomework sends pagination only — the endpoint has no due-date window", async () => {
    mockFetchSuccess({ items: [], total: 0 });
    await getHomework({ limit: 1 });
    expect(lastFetchCall()[0]).toBe("/api/homework?limit=1");
  });

  it("getHomeworkById calls /homework/:id", async () => {
    const mockHomework = { id: "hw1" };
    mockFetchSuccess(mockHomework);

    const result = await getHomeworkById("hw1");
    expect(result).toEqual(mockHomework);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/homework/hw1");
    expect(init?.method).toBe("GET");
  });

  it("patchHomeworkById calls /homework/:id", async () => {
    const mockHomework = { id: "hw1", title: "New" };
    mockFetchSuccess(mockHomework);

    const body = { title: "New", assigned: null };
    const result = await patchHomeworkById("hw1", body);
    expect(result).toEqual(mockHomework);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/homework/hw1");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(body));
  });

  it("deleteHomeworkById calls /homework/:id", async () => {
    mockFetch204();

    await deleteHomeworkById("hw1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/homework/hw1");
    expect(init?.method).toBe("DELETE");
  });

  it("postHomeworkSubmission calls /homework/:id/submission", async () => {
    const mockSubmission = { homework: "hw1", text: "Done" };
    mockFetchSuccess(mockSubmission);

    const body = { text: "Done" };
    const result = await postHomeworkSubmission("hw1", body);
    expect(result).toEqual(mockSubmission);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/homework/hw1/submission");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(body));
  });

  it("getHomeworkSubmission calls /homework/:id/submission", async () => {
    const mockSubmission = { homework: "hw1" };
    mockFetchSuccess(mockSubmission);

    const result = await getHomeworkSubmission("hw1");
    expect(result).toEqual(mockSubmission);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/homework/hw1/submission");
    expect(init?.method).toBe("GET");
  });

  it("deleteHomeworkSubmission calls /homework/:id/submission", async () => {
    mockFetch204();

    await deleteHomeworkSubmission("hw1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/homework/hw1/submission");
    expect(init?.method).toBe("DELETE");
  });

  it("postHomeworkSubmissionFile calls /homework/:id/submission/files with FormData", async () => {
    const mockFile = { id: "f1", name: "a.txt" };
    mockFetchSuccess(mockFile, 201);

    const file = new File(["x"], "a.txt", { type: "text/plain" });
    const result = await postHomeworkSubmissionFile("hw1", file);
    expect(result).toEqual(mockFile);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/homework/hw1/submission/files");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
  });

  it("getHomeworkSubmissionFileBlob calls /homework/:id/submission/files/:fid", async () => {
    const blob = new Blob(["x"], { type: "text/plain" });
    mockFetchBlob(blob);

    const result = await getHomeworkSubmissionFileBlob("hw1", "f1");
    expect(result.type).toBe("text/plain");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/homework/hw1/submission/files/f1");
    expect(init?.credentials).toBe("same-origin");
  });

  it("getHomeworkSubmissionFileUrl returns encoded URL", () => {
    expect(getHomeworkSubmissionFileUrl("hw/1", "f?1")).toBe("/api/homework/hw%2F1/submission/files/f%3F1");
  });

  it("getHomeworkRosterSubmissionFileUrl returns encoded URL", () => {
    expect(getHomeworkRosterSubmissionFileUrl("hw/1", "u?1", "f?1")).toBe("/api/homework/hw%2F1/submissions/u%3F1/files/f%3F1");
  });

  it("deleteHomeworkSubmissionFile calls /homework/:id/submission/files/:fid", async () => {
    mockFetch204();

    await deleteHomeworkSubmissionFile("hw1", "f1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/homework/hw1/submission/files/f1");
    expect(init?.method).toBe("DELETE");
  });

  it("postHomeworkResult calls /homework/:id/results", async () => {
    const mockResult = { status: "done", mark: 95 };
    mockFetchSuccess(mockResult);

    const body = { user: "u1", status: "done", mark: 95 };
    const result = await postHomeworkResult("hw1", body);
    expect(result).toEqual(mockResult);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/homework/hw1/results");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(body));
  });

  it("deleteHomeworkResultByUserId calls /homework/:id/results/:user", async () => {
    mockFetch204();

    await deleteHomeworkResultByUserId("hw1", "u1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/homework/hw1/results/u1");
    expect(init?.method).toBe("DELETE");
  });

  it("getHomeworkResult calls /homework/:id/result", async () => {
    const mockResult = { status: "done" };
    mockFetchSuccess(mockResult);

    const result = await getHomeworkResult("hw1");
    expect(result).toEqual(mockResult);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/homework/hw1/result");
    expect(init?.method).toBe("GET");
  });

  it("getHomeworkSubmissions calls /homework/:id/submissions", async () => {
    const mockPage = { items: [{ user: "u1" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getHomeworkSubmissions("hw1", { limit: 20 });
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/homework/hw1/submissions?limit=20");
    expect(init?.method).toBe("GET");
  });

  it("getHomeworkReport calls /homework/report/:user", async () => {
    const mockPage = { items: [{ homework: "hw1" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getHomeworkReport("u1", { offset: 10 });
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/homework/report/u1?offset=10");
    expect(init?.method).toBe("GET");
  });
});
