import { afterEach, describe, expect, it, vi } from "vitest";
import { getSolutions, postSolution, patchSolutionById, deleteSolutionById, getSolutionImageUrl } from "../../solutions";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

describe("solutions API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getSolutions calls /questions/:id/solutions with pagination", async () => {
    const mockPage = { items: [{ id: "s1" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getSolutions("q1", { limit: 10 });
    expect(result).toEqual(mockPage);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/questions/q1/solutions?limit=10");
    expect(init?.method).toBe("GET");
  });

  it("postSolution calls /questions/:id/solutions with data", async () => {
    const mockSolution = { id: "s1" };
    mockFetchSuccess(mockSolution);

    const data = { body: "Body" };
    const result = await postSolution("q1", data);
    expect(result).toEqual(mockSolution);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/questions/q1/solutions");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(data));
  });

  it("patchSolutionById calls /questions/:id/solutions/:sid with updates", async () => {
    const mockSolution = { id: "s1", body: "Updated" };
    mockFetchSuccess(mockSolution);

    const updates = { body: "Updated" };
    const result = await patchSolutionById("q1", "s1", updates);
    expect(result).toEqual(mockSolution);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/questions/q1/solutions/s1");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(updates));
  });

  it("deleteSolutionById calls /questions/:id/solutions/:sid", async () => {
    mockFetch204();

    await deleteSolutionById("q1", "s1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/questions/q1/solutions/s1");
    expect(init?.method).toBe("DELETE");
  });

  it("getSolutionImageUrl returns correct URL", () => {
    const url = getSolutionImageUrl("q1", "s1");
    expect(url).toBe("/api/questions/q1/solutions/s1/image");
  });
});
