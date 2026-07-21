import { afterEach, describe, expect, it, vi } from "vitest";
import { patchSubjectById } from "../../subjects";
import { deleteSubjectById } from "../../subjects";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

describe("subjects API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("patchSubjectById calls /subjects/:id with updates", async () => {
    const mockSubject = { id: "sub1", name: "Updated" };
    mockFetchSuccess(mockSubject);

    const updates = { name: "Updated" };
    const result = await patchSubjectById("sub1", updates);
    expect(result).toEqual(mockSubject);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/subjects/sub1");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(updates));
  });

  it("deleteSubjectById calls /subjects/:id", async () => {
    mockFetch204();

    await deleteSubjectById("sub1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/subjects/sub1");
    expect(init?.method).toBe("DELETE");
  });
});
