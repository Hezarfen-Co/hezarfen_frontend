import { afterEach, describe, expect, it, vi } from "vitest";
import { getChatbotMessageById, postChatbotMessage, postChatbotThread } from "../../chatbot";
import { lastFetchCall, mockFetchSuccess } from "../helpers/mock-fetch";

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
