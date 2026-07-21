import { afterEach, describe, expect, it, vi } from "vitest";
import { getExams } from "../../exams";
import { getExamById } from "../../exams";
import { patchExamById } from "../../exams";
import { deleteExamById } from "../../exams";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

describe("exams API - core", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getExams calls /exams with pagination", async () => {
    const mockPage = { items: [{ id: "ex1" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getExams({ limit: 10 });
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams?limit=10");
    expect(init?.method).toBe("GET");
  });

  it("getExamById calls /exams/:id", async () => {
    const mockExam = { id: "ex1", title: "Exam" };
    mockFetchSuccess(mockExam);

    const result = await getExamById("ex1");
    expect(result).toEqual(mockExam);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1");
    expect(init?.method).toBe("GET");
  });

  it("patchExamById calls /exams/:id with updates", async () => {
    const mockExam = { id: "ex1", title: "Updated" };
    mockFetchSuccess(mockExam);

    const updates = { title: "Updated" };
    const result = await patchExamById("ex1", updates);
    expect(result).toEqual(mockExam);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(updates));
  });

  it("deleteExamById calls /exams/:id", async () => {
    mockFetch204();

    await deleteExamById("ex1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1");
    expect(init?.method).toBe("DELETE");
  });
});
