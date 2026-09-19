import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deleteRagThreadById,
  getRagMessageById,
  getRagThreadMessages,
  getRagThreads,
  patchRagThreadById,
  postRagMessage,
  postRagQuestions,
  postRagSummarize,
  postRagThread,
  ragStreamUrl,
} from "../../rag";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

describe("rag API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getRagThreads GETs /rag/threads with pagination", async () => {
    mockFetchSuccess({ items: [{ id: "r1" }], total: 1 });

    const result = await getRagThreads({ limit: 10 });
    expect(result.items).toEqual([{ id: "r1" }]);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/rag/threads?limit=10");
    expect(init?.method).toBe("GET");
  });

  it("postRagThread POSTs /rag/threads with the title", async () => {
    mockFetchSuccess({ id: "r1" });

    await postRagThread("Fizik ödevi");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/rag/threads");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ title: "Fizik ödevi" }));
  });

  it("postRagThread sends a null title when none is given", async () => {
    mockFetchSuccess({ id: "r1" });

    await postRagThread();

    const [, init] = lastFetchCall();
    expect(init?.body).toBe(JSON.stringify({ title: null }));
  });

  it("patchRagThreadById PATCHes /rag/threads/:id", async () => {
    mockFetchSuccess({ id: "r1" });

    await patchRagThreadById("r1", null);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/rag/threads/r1");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify({ title: null }));
  });

  it("deleteRagThreadById DELETEs /rag/threads/:id", async () => {
    mockFetch204();

    await deleteRagThreadById("r1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/rag/threads/r1");
    expect(init?.method).toBe("DELETE");
  });

  it("getRagThreadMessages GETs /rag/threads/:id/messages", async () => {
    mockFetchSuccess({ items: [], total: 0 });

    await getRagThreadMessages("r1", { limit: 50 });

    const [url] = lastFetchCall();
    expect(url).toBe("/api/rag/threads/r1/messages?limit=50");
  });

  it("getRagMessageById GETs one turn", async () => {
    mockFetchSuccess({ id: "m1", status: "pending" });

    await getRagMessageById("r1", "m1");

    const [url] = lastFetchCall();
    expect(url).toBe("/api/rag/threads/r1/messages/m1");
  });

  it("postRagMessage POSTs /rag/threads/:id/messages with the content", async () => {
    mockFetchSuccess({ message_id: "m1", status: "pending" }, 202);

    const result = await postRagMessage("r1", "Newton'un ikinci yasası?");
    expect(result.message_id).toBe("m1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/rag/threads/r1/messages");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ content: "Newton'un ikinci yasası?" }));
  });

  it("ragStreamUrl builds the SSE path for an EventSource", () => {
    expect(ragStreamUrl("r 1", "m1")).toBe("/api/rag/threads/r%201/messages/m1/stream");
  });
  it("postRagSummarize POSTs /rag/summarize with the study scope", async () => {
    mockFetchSuccess({ text: "Özet", abstained: false, reason: "", citations: [], scope_pages: [3, 4], hierarchical: false });

    const result = await postRagSummarize({ ders: "Fizik", sinif: "9", span_ids: ["s1", "s2"], scope_label: "Kuvvet" });
    expect(result.scope_pages).toEqual([3, 4]);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/rag/summarize");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ ders: "Fizik", sinif: "9", span_ids: ["s1", "s2"], scope_label: "Kuvvet" }));
  });

  it("postRagQuestions POSTs /rag/questions with the scope and set shape", async () => {
    mockFetchSuccess({ items: [{ question: "Q?", answer: "A", difficulty: "orta" }], abstained: false, reason: "", span_ids: ["s1"], pages: [3] });

    const result = await postRagQuestions({ ders: "Fizik", pages: [3], n: 3, difficulty: "kolay" });
    expect(result.items[0]?.answer).toBe("A");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/rag/questions");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ ders: "Fizik", pages: [3], n: 3, difficulty: "kolay" }));
  });
});
