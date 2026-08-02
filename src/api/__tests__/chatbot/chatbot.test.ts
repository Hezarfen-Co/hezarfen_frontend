import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteChatbotThreadById, getChatbotMessageById, getChatbotThreadMessages, getChatbotThreads, patchChatbotThreadById, postChatbotMessage, postChatbotThread } from "../../chatbot";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

describe("chatbot API", () => {
  afterEach(() => vi.restoreAllMocks());

  it("creates an untitled chatbot thread", async () => {
    mockFetchSuccess({ id: "thread-1" });
    await postChatbotThread();
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/chatbot/threads");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe("{}");
  });
  it("lists threads and a selected thread's messages", async () => {
    mockFetchSuccess({ items: [], total: 0 }); await getChatbotThreads({ limit: 20 }); expect(lastFetchCall()[0]).toBe("/api/chatbot/threads?limit=20");
    mockFetchSuccess({ items: [], total: 0 }); await getChatbotThreadMessages("thread 1", { limit: 20 }); expect(lastFetchCall()[0]).toBe("/api/chatbot/threads/thread%201/messages?limit=20");
  });
  it("renames and deletes a thread", async () => {
    mockFetchSuccess({}); await patchChatbotThreadById("thread 1", { title: "Physics" }); expect(lastFetchCall()).toMatchObject(["/api/chatbot/threads/thread%201", { method: "PATCH", body: JSON.stringify({ title: "Physics" }) }]);
    mockFetch204(); await deleteChatbotThreadById("thread 1"); expect(lastFetchCall()).toMatchObject(["/api/chatbot/threads/thread%201", { method: "DELETE" }]);
  });

  it("sends a message to its thread", async () => {
    mockFetchSuccess({ message_id: "answer-1", status: "pending" });
    await postChatbotMessage("thread 1", "Merhaba");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/chatbot/threads/thread%201/messages");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ content: "Merhaba" }));
  });

  it("reads a pending or completed assistant message", async () => {
    mockFetchSuccess({ id: "answer-1", status: "complete" });
    await getChatbotMessageById("thread-1", "answer-1");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/chatbot/threads/thread-1/messages/answer-1");
    expect(init?.method).toBe("GET");
  });
});
