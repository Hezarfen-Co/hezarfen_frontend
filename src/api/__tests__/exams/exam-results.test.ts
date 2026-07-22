import { afterEach, describe, expect, it, vi } from "vitest";
import { getExamResults } from "../../exams";
import { getExamResult } from "../../exams";
import { postExamResult } from "../../exams";
import { deleteExamResultByUserId } from "../../exams";
import { getExamStatistics } from "../../exams";
import { getStudentAnswers, getStudentAnswerImage } from "../../exams";
import { lastFetchCall, mockFetch204, mockFetchBlob, mockFetchSuccess } from "../helpers/mock-fetch";

describe("exams API - results", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getExamResults calls /exams/:id/results", async () => {
    const mockPage = { items: [{ id: "r1" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getExamResults("ex1");
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/results");
    expect(init?.method).toBe("GET");
  });

  it("getExamResult calls /exams/:id/result", async () => {
    const mockResult = { id: "r1", mark: 90 };
    mockFetchSuccess(mockResult);

    const result = await getExamResult("ex1");
    expect(result).toEqual(mockResult);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/result");
    expect(init?.method).toBe("GET");
  });

  it("postExamResult calls /exams/:id/results", async () => {
    const mockResult = { id: "r1", mark: 90 };
    mockFetchSuccess(mockResult);

    const data = { user_id: "u1", mark: 90 };
    const result = await postExamResult("ex1", data);
    expect(result).toEqual(mockResult);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/results");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(data));
  });

  it("deleteExamResultByUserId calls /exams/:id/results/:userId", async () => {
    mockFetch204();

    await deleteExamResultByUserId("ex1", "u1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/results/u1");
    expect(init?.method).toBe("DELETE");
  });

  it("getExamStatistics calls /exams/:id/statistics", async () => {
    const mockStats = { exam: "ex1", average: 85 };
    mockFetchSuccess(mockStats);

    const result = await getExamStatistics("ex1");
    expect(result).toEqual(mockStats);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/statistics");
    expect(init?.method).toBe("GET");
  });

  it("getStudentAnswers calls /exams/:id/attempts/:userId/answers", async () => {
    const mockAnswers = { exam: "ex1", answers: [] };
    mockFetchSuccess(mockAnswers);

    const result = await getStudentAnswers("ex1", "u1");
    expect(result).toEqual(mockAnswers);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/attempts/u1/answers");
    expect(init?.method).toBe("GET");
  });

  it("getStudentAnswerImage calls the grader answer-image URL with the API prefix applied once", async () => {
    mockFetchBlob(new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" }));

    const result = await getStudentAnswerImage("ex1", "u1", "q1");
    expect(result).toBeInstanceOf(Blob);

    // Must match the hardcoded <img src> template in answer-sheet-view.tsx exactly, or
    // "Play drawing" fetches different bytes than the static image already on screen.
    const [url] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/attempts/u1/answers/q1/image");
  });
});
