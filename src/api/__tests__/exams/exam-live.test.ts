import { afterEach, describe, expect, it, vi } from "vitest";
import { getExamLive } from "../../exams";
import { lastFetchCall, mockFetchSuccess } from "../helpers/mock-fetch";

describe("exams API - live", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getExamLive calls /exams/:id/live", async () => {
    const mockLive = { exam: { id: "ex1" }, students: [] };
    mockFetchSuccess(mockLive);

    const result = await getExamLive("ex1");
    expect(result).toEqual(mockLive);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/live");
    expect(init?.method).toBe("GET");
  });
});
