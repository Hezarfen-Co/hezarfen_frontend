import { afterEach, describe, expect, it, vi } from "vitest";
import { getTerms } from "../../terms";
import { getTermById } from "../../terms";
import { postTerm } from "../../terms";
import { patchTermById } from "../../terms";
import { deleteTermById } from "../../terms";
import { postTermArchive } from "../../terms";
import { postTermUnarchive } from "../../terms";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";
describe("terms API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getTerms calls /terms with pagination", async () => {
    const mockPage = { items: [{ id: "t1" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getTerms({ limit: 10 });
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/terms?limit=10");
    expect(init?.method).toBe("GET");
  });

  it("postTerm calls /terms with data", async () => {
    const mockTerm = { id: "t1" };
    mockFetchSuccess(mockTerm);

    const data = { name: "Term 1", starts_at: 1000, ends_at: 2000 };
    const result = await postTerm(data);
    expect(result).toEqual(mockTerm);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/terms");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(data));
  });

  it("getTermById calls /terms/:id", async () => {
    const mockTerm = { id: "t1", name: "Term 1" };
    mockFetchSuccess(mockTerm);

    const result = await getTermById("t1");
    expect(result).toEqual(mockTerm);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/terms/t1");
    expect(init?.method).toBe("GET");
  });

  it("patchTermById calls /terms/:id with updates", async () => {
    const mockTerm = { id: "t1", name: "Updated" };
    mockFetchSuccess(mockTerm);

    const updates = { name: "Updated" };
    const result = await patchTermById("t1", updates);
    expect(result).toEqual(mockTerm);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/terms/t1");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(updates));
  });

  it("deleteTermById calls /terms/:id", async () => {
    mockFetch204();

    await deleteTermById("t1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/terms/t1");
    expect(init?.method).toBe("DELETE");
  });

  it("postTermArchive calls /terms/:id/archive", async () => {
    const mockTerm = { id: "t1", archived_at: 1756896000000 };
    mockFetchSuccess(mockTerm);

    const result = await postTermArchive("t1");
    expect(result).toEqual(mockTerm);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/terms/t1/archive");
    expect(init?.method).toBe("POST");
  });

  it("postTermUnarchive calls /terms/:id/unarchive", async () => {
    const mockTerm = { id: "t1", archived_at: null };
    mockFetchSuccess(mockTerm);

    const result = await postTermUnarchive("t1");
    expect(result).toEqual(mockTerm);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/terms/t1/unarchive");
    expect(init?.method).toBe("POST");
  });
});
