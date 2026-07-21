import { afterEach, describe, expect, it, vi } from "vitest";
import { getTime } from "../../time";
import { lastFetchCall, mockFetchSuccess } from "../helpers/mock-fetch";

describe("time API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getTime calls /time", async () => {
    const mockTime = { server_time: 1000 };
    mockFetchSuccess(mockTime);

    const result = await getTime();
    expect(result).toEqual(mockTime);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/time");
    expect(init?.method).toBe("GET");
  });
});
