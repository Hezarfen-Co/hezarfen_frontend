import { afterEach, describe, expect, it, vi } from "vitest";
import { getSettings, setCachedSettings } from "../../getSettings";
import { patchSettings } from "../../patchSettings";
import { lastFetchCall, mockFetchSuccess } from "../helpers/mock-fetch";

describe("settings API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // Reset cache for each test
    setCachedSettings(null as any); 
  });

  it("getSettings calls /settings and caches the result", async () => {
    const mockSettings = { max_file_bytes: 1000 };
    mockFetchSuccess(mockSettings);

    const result1 = await getSettings();
    expect(result1).toEqual(mockSettings);
    
    const [url] = lastFetchCall();
    expect(url).toBe("/api/settings");

    // Second call should hit cache, not fetch
    vi.mocked(globalThis.fetch).mockClear();
    const result2 = await getSettings();
    expect(result2).toEqual(mockSettings);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("patchSettings calls /settings with updates and updates cache", async () => {
    const mockSettings = { max_file_bytes: 2000 };
    mockFetchSuccess(mockSettings);

    const updates = { max_file_bytes: 2000 };
    const result = await patchSettings(updates);
    expect(result).toEqual(mockSettings);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/settings");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(updates));

    // Next getSettings should hit updated cache
    vi.mocked(globalThis.fetch).mockClear();
    const cached = await getSettings();
    expect(cached).toEqual(mockSettings);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
