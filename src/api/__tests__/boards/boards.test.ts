import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deleteBoardById,
  getBoardById,
  getBoardEpochs,
  getBoardHistory,
  getBoardStrokes,
  getBoards,
  patchBoardById,
  postBoard,
  postBoardClear,
  postBoardClose,
  postBoardInvite,
} from "../../boards";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

describe("boards API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("postBoard calls POST /boards with the body", async () => {
    mockFetchSuccess({ id: "b1", title: "Math" });
    const body = { title: "Math", participants: ["u2", "u3"] };
    await postBoard(body);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/boards");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(body));
  });

  it("getBoards calls GET /boards with pagination", async () => {
    const mockPage = { items: [{ id: "b1" }], total: 1 };
    mockFetchSuccess(mockPage);
    const result = await getBoards({ limit: 10, offset: 20 });
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/boards?limit=10&offset=20");
    expect(init?.method).toBe("GET");
  });

  it("getBoards sends q with pagination when given", async () => {
    mockFetchSuccess({ items: [], total: 0 });
    await getBoards({ limit: 10, offset: 20, q: "math, physics" });

    const [url] = lastFetchCall();
    expect(url).toBe("/api/boards?q=math%2C+physics&limit=10&offset=20");
  });

  it("getBoards omits a blank q", async () => {
    mockFetchSuccess({ items: [], total: 0 });
    await getBoards({ q: "   " });

    const [url] = lastFetchCall();
    expect(url).toBe("/api/boards");
  });

  it("getBoardById calls GET /boards/:id", async () => {
    mockFetchSuccess({ id: "b1" });
    await getBoardById("b1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/boards/b1");
    expect(init?.method).toBe("GET");
  });

  it("getBoardStrokes calls GET /boards/:id/strokes", async () => {
    mockFetchSuccess({ items: [], total: 0 });
    await getBoardStrokes("b1", { limit: 200 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/boards/b1/strokes?limit=200");
    expect(init?.method).toBe("GET");
  });

  it("getBoardHistory calls GET /boards/:id/history with epoch + pagination", async () => {
    mockFetchSuccess({ items: [], total: 0 });
    await getBoardHistory("b1", { epoch: 3, limit: 50 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/boards/b1/history?epoch=3&limit=50");
    expect(init?.method).toBe("GET");
  });

  it("getBoardHistory omits epoch when not given", async () => {
    mockFetchSuccess({ items: [], total: 0 });
    await getBoardHistory("b1");

    const [url] = lastFetchCall();
    expect(url).toBe("/api/boards/b1/history");
  });

  it("getBoardEpochs calls GET /boards/:id/epochs", async () => {
    mockFetchSuccess({ items: [], total: 0 });
    await getBoardEpochs("b1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/boards/b1/epochs");
    expect(init?.method).toBe("GET");
  });

  it("patchBoardById calls PATCH /boards/:id with the body", async () => {
    mockFetchSuccess({ id: "b1" });
    const body = { locked: true };
    await patchBoardById("b1", body);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/boards/b1");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(body));
  });

  it("postBoardClear calls POST /boards/:id/clear", async () => {
    mockFetchSuccess({ id: "s1", kind: "clear" });
    await postBoardClear("b1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/boards/b1/clear");
    expect(init?.method).toBe("POST");
  });

  it("postBoardClose calls POST /boards/:id/close", async () => {
    mockFetchSuccess({ id: "b1", closed_at: 123 });
    await postBoardClose("b1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/boards/b1/close");
    expect(init?.method).toBe("POST");
  });

  it("deleteBoardById calls DELETE /boards/:id", async () => {
    mockFetch204();
    await deleteBoardById("b1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/boards/b1");
    expect(init?.method).toBe("DELETE");
  });

  it("postBoardInvite POSTs a class invite to /boards/:id/invite", async () => {
    mockFetchSuccess({ id: "b1", participants: ["u1", "u2"] });
    const body = { kind: "class", class: "cl1" } as const;
    await postBoardInvite("b1", body);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/boards/b1/invite");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(body));
  });

  it("postBoardInvite POSTs a course invite", async () => {
    mockFetchSuccess({ id: "b1", participants: [] });
    const body = { kind: "course", course: "co1" } as const;
    await postBoardInvite("b1", body);
    expect(lastFetchCall()[1]?.body).toBe(JSON.stringify(body));
  });

  it("postBoardInvite POSTs an event invite", async () => {
    mockFetchSuccess({ id: "b1", participants: [] });
    const body = { kind: "event", event: "e1" } as const;
    await postBoardInvite("b1", body);
    expect(lastFetchCall()[1]?.body).toBe(JSON.stringify(body));
  });
});
