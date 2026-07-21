import { afterEach, describe, expect, it, vi } from "vitest";
import { getTerms } from "../../terms";
import { postTerm } from "../../terms";
import { patchTermById } from "../../terms";
import { deleteTermById } from "../../terms";
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
});
