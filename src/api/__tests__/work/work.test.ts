import { afterEach, describe, expect, it, vi } from "vitest";
import { getMyWorkLog } from "../../work";
import { getUserWorkLog } from "../../work";
import { postWorkCheckIn } from "../../work";
import { postWorkCheckOut } from "../../work";
import { patchWorkEntryById } from "../../work";
import { deleteWorkEntryById } from "../../work";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

describe("work API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getMyWorkLog calls /work/me with pagination", async () => {
    const mockPage = { items: [{ id: "w1" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getMyWorkLog({ limit: 10 });
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/work/me?limit=10");
    expect(init?.method).toBe("GET");
  });

  it("getUserWorkLog calls /work/:id with pagination", async () => {
    const mockPage = { items: [{ id: "w1" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getUserWorkLog("u1", { limit: 10 });
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/work/u1?limit=10");
    expect(init?.method).toBe("GET");
  });

  it("postWorkCheckIn calls /work/check-in", async () => {
    const mockEntry = { id: "w1", check_in: 1000 };
    mockFetchSuccess(mockEntry);

    const result = await postWorkCheckIn();
    expect(result).toEqual(mockEntry);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/work/check-in");
    expect(init?.method).toBe("POST");
  });

  it("postWorkCheckOut calls /work/check-out", async () => {
    const mockEntry = { id: "w1", check_out: 2000 };
    mockFetchSuccess(mockEntry);

    const result = await postWorkCheckOut();
    expect(result).toEqual(mockEntry);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/work/check-out");
    expect(init?.method).toBe("POST");
  });

  it("patchWorkEntryById calls /work/:id with updates", async () => {
    const mockEntry = { id: "w1", check_out: 2000 };
    mockFetchSuccess(mockEntry);

    const updates = { check_out: 2000 };
    const result = await patchWorkEntryById("w1", updates);
    expect(result).toEqual(mockEntry);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/work/entries/w1");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(updates));
  });

  it("deleteWorkEntryById calls /work/:id", async () => {
    mockFetch204();

    await deleteWorkEntryById("w1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/work/entries/w1");
    expect(init?.method).toBe("DELETE");
  });
});
