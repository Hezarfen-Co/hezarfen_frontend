import { afterEach, describe, expect, it, vi } from "vitest";
import { getExamLive } from "../../getExamLive";
import { getExamLiveStreamUrl } from "../../getExamLiveStreamUrl";
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

  it("getExamLiveStreamUrl returns correct URL", () => {
    const url = getExamLiveStreamUrl("ex1");
    expect(url).toBe("/api/exams/ex1/live/stream");
  });

  it("getExamLiveStreamUrl encodes examId correctly", () => {
    const url = getExamLiveStreamUrl("ex1/abc?xyz");
    expect(url).toBe("/api/exams/ex1%2Fabc%3Fxyz/live/stream");
  });
});
