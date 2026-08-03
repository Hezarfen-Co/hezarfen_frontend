import { afterEach, describe, expect, it, vi } from "vitest";
import { getQuestions, getQuestionById, postQuestion, postQuestionApprove, deleteQuestionById, getQuestionImageUrl, getQuestionImageBlob, postQuestionImage, deleteQuestionImage } from "../../shared";
import { lastFetchCall, mockFetch204, mockFetchBlob, mockFetchSuccess } from "../helpers/mock-fetch";

describe("questions API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getQuestions calls /questions with status and pagination", async () => {
    const mockPage = { items: [{ id: "q1" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getQuestions("pending", { limit: 10 });
    expect(result).toEqual(mockPage); // page normalization is handled by client in questions.ts? no, client doesn't normalize, wait, questions.ts doesn't normalize!

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/questions?status=pending&limit=10");
    expect(init?.method).toBe("GET");
  });

  it("getQuestionById calls /questions/:id", async () => {
    const mockQuestion = { id: "q1" };
    mockFetchSuccess(mockQuestion);

    const result = await getQuestionById("q1");
    expect(result).toEqual(mockQuestion);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/questions/q1");
    expect(init?.method).toBe("GET");
  });

  it("postQuestion calls /questions with data", async () => {
    const mockQuestion = { id: "q1" };
    mockFetchSuccess(mockQuestion);

    const data = { title: "Title", body: "Body" };
    const result = await postQuestion(data);
    expect(result).toEqual(mockQuestion);

    const [url, init] = lastFetchCall();
    // note: if image is not provided, it only calls POST /questions once
    expect(url).toBe("/api/questions");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(data));
  });

  it("postQuestionApprove calls /questions/:id/approve", async () => {
    const mockQuestion = { id: "q1", status: "approved" };
    mockFetchSuccess(mockQuestion);

    const result = await postQuestionApprove("q1");
    expect(result).toEqual(mockQuestion);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/questions/q1/approve");
    expect(init?.method).toBe("POST");
  });

  it("deleteQuestionById calls /questions/:id", async () => {
    mockFetch204();

    await deleteQuestionById("q1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/questions/q1");
    expect(init?.method).toBe("DELETE");
  });

  it("getQuestionImageUrl returns correct URL", () => {
    const url = getQuestionImageUrl("q1");
    expect(url).toBe("/api/questions/q1/image");
  });

  it("getQuestionImageBlob fetches the image bytes from the same URL", async () => {
    mockFetchBlob(new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" }));

    const result = await getQuestionImageBlob("q1");
    expect(result).toBeInstanceOf(Blob);

    const [url] = lastFetchCall();
    expect(url).toBe(getQuestionImageUrl("q1"));
  });

  it("postQuestionImage uploads multipart to /questions/:id/image", async () => {
    mockFetch204();

    await postQuestionImage("q1", new File(["x"], "sketch.png", { type: "image/png" }));

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/questions/q1/image");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
    expect((init?.body as FormData).get("file")).toBeInstanceOf(File);
  });

  it("deleteQuestionImage calls /questions/:id/image", async () => {
    mockFetch204();

    await deleteQuestionImage("q1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/questions/q1/image");
    expect(init?.method).toBe("DELETE");
  });
});
