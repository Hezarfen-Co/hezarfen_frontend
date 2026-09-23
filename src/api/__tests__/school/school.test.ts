import { afterEach, describe, expect, it, vi } from "vitest";
import { getSchool } from "../../school";
import { lastFetchCall, mockFetchSuccess } from "../helpers/mock-fetch";

describe("school API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getSchool reads the session's school from /school", async () => {
    const identity = { id: "01a0b0a5-ffb5-7682-8726-7e4ef1a5c68d", name: "Ata Koleji" };
    mockFetchSuccess(identity);

    const result = await getSchool();
    expect(result).toEqual(identity);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/school");
    expect(init?.method).toBe("GET");
  });
});
