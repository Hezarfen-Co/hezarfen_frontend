import { afterEach, describe, expect, it, vi } from "vitest";
import { getMessages } from "../../messages";
import { postMessage } from "../../messages";
import { patchMessageById } from "../../messages";
import { deleteMessageById } from "../../messages";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

describe("messages API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getMessages calls /messages with folder and pagination", async () => {
    const mockPage = { items: [{ id: "m1" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getMessages("inbox", { limit: 10, read: false });
    expect(result).toEqual(mockPage); // page.ts normalizes, but getMessages has raw return

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/messages?folder=inbox&read=false&limit=10");
    expect(init?.method).toBe("GET");
  });

  it("postMessage calls /messages with data", async () => {
    const mockMessage = { id: "m1" };
    mockFetchSuccess(mockMessage);

    const data = { recipient_id: "u1", subject: "Hello", body: "World" };
    const result = await postMessage(data);
    expect(result).toEqual(mockMessage);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/messages");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(data));
  });

  it("patchMessageById calls /messages/:id with updates", async () => {
    const mockMessage = { id: "m1", read: true };
    mockFetchSuccess(mockMessage);

    const updates = { read: true };
    const result = await patchMessageById("m1", updates);
    expect(result).toEqual(mockMessage);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/messages/m1");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(updates));
  });

  it("deleteMessageById calls /messages/:id", async () => {
    mockFetch204();

    await deleteMessageById("m1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/messages/m1");
    expect(init?.method).toBe("DELETE");
  });
});
