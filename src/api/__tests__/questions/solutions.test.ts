import { afterEach, describe, expect, it, vi } from "vitest";
import { getSolutions, postSolution, patchSolutionById, deleteSolutionById, getSolutionImageUrl, getSolutionImageBlob, postSolutionImage, deleteSolutionImage } from "../../shared";
import { lastFetchCall, mockFetch204, mockFetchBlob, mockFetchSuccess } from "../helpers/mock-fetch";

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

  it("getSolutionImageBlob fetches the image bytes from the same URL", async () => {
    mockFetchBlob(new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" }));

    const result = await getSolutionImageBlob("q1", "s1");
    expect(result).toBeInstanceOf(Blob);

    const [url] = lastFetchCall();
    expect(url).toBe(getSolutionImageUrl("q1", "s1"));
  });

  it("postSolutionImage uploads multipart to /questions/:id/solutions/:sid/image", async () => {
    mockFetch204();

    await postSolutionImage("q1", "s1", new File(["x"], "work.png", { type: "image/png" }));

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/questions/q1/solutions/s1/image");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
    expect((init?.body as FormData).get("file")).toBeInstanceOf(File);
  });

  it("deleteSolutionImage calls /questions/:id/solutions/:sid/image", async () => {
    mockFetch204();

    await deleteSolutionImage("q1", "s1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/questions/q1/solutions/s1/image");
    expect(init?.method).toBe("DELETE");
  });
});
