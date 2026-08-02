import { afterEach, describe, expect, it, vi } from "vitest";
import { getLimits, setCachedLimits } from "../../limits";
import { lastFetchCall, mockFetchSuccess } from "../helpers/mock-fetch";

describe("limits API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setCachedLimits(null);
  });

  it("loads /limits once and caches it", async () => {
    mockFetchSuccess({ user: { min_username_len: 3 } });
    await getLimits();
    expect(lastFetchCall()[0]).toBe("/api/limits");
    vi.mocked(globalThis.fetch).mockClear();
    await getLimits();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
