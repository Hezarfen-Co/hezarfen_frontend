import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deleteBankChoiceImage,
  deleteBankQuestionById,
  deleteBankQuestionImage,
  getBankChoiceImageBlob,
  getBankQuestionById,
  getBankQuestionImageBlob,
  getBankQuestions,
  patchBankQuestionById,
  postBankChoiceImage,
  postBankQuestion,
  postBankQuestionImage,
} from "../../bank-questions";
import { lastFetchCall, mockFetch204, mockFetchBlob, mockFetchSuccess } from "../helpers/mock-fetch";

describe("bank-questions API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("postBankQuestion calls /bank-questions with data", async () => {
    const mockQuestion = { id: "b1" };
    mockFetchSuccess(mockQuestion, 201);

    const data = { subject_id: "sub1", text: "Q?", kind: "choice" as const, points: 10 };
    const result = await postBankQuestion(data);
    expect(result).toEqual(mockQuestion);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/bank-questions");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(data));
  });

  it("getBankQuestions calls /bank-questions without a query when unfiltered", async () => {
    const mockPage = { items: [{ id: "b1" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getBankQuestions();
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/bank-questions");
    expect(init?.method).toBe("GET");
  });

  it("getBankQuestions passes subject, owner and page params", async () => {
    mockFetchSuccess({ items: [], total: 0 });

    await getBankQuestions({ subject: "sub1", owner: "me", limit: 20, offset: 40 });

    const [url] = lastFetchCall();
    expect(url).toBe("/api/bank-questions?subject=sub1&owner=me&limit=20&offset=40");
  });

  it("getBankQuestionById calls /bank-questions/:bid", async () => {
    const mockQuestion = { id: "b1" };
    mockFetchSuccess(mockQuestion);

    const result = await getBankQuestionById("b1");
    expect(result).toEqual(mockQuestion);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/bank-questions/b1");
    expect(init?.method).toBe("GET");
  });

  it("patchBankQuestionById calls /bank-questions/:bid with updates", async () => {
    const mockQuestion = { id: "b1", text: "Updated" };
    mockFetchSuccess(mockQuestion);

    const updates = { text: "Updated" };
    const result = await patchBankQuestionById("b1", updates);
    expect(result).toEqual(mockQuestion);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/bank-questions/b1");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(updates));
  });

  it("deleteBankQuestionById calls /bank-questions/:bid", async () => {
    mockFetch204();

    await deleteBankQuestionById("b1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/bank-questions/b1");
    expect(init?.method).toBe("DELETE");
  });

  it("postBankQuestionImage calls /bank-questions/:bid/image with FormData", async () => {
    const mockMeta = { content_type: "image/png", size: 100 };
    mockFetchSuccess(mockMeta, 201);

    const file = new File(["test"], "test.png", { type: "image/png" });
    const result = await postBankQuestionImage("b1", file);
    expect(result).toEqual(mockMeta);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/bank-questions/b1/image");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
  });

  it("getBankQuestionImageBlob calls /bank-questions/:bid/image", async () => {
    mockFetchBlob(new Blob(["img"], { type: "image/png" }));

    const result = await getBankQuestionImageBlob("b1");
    expect(result).toBeInstanceOf(Blob);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/bank-questions/b1/image");
    expect(init?.method).toBeUndefined();
  });

  it("deleteBankQuestionImage calls /bank-questions/:bid/image", async () => {
    mockFetch204();

    await deleteBankQuestionImage("b1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/bank-questions/b1/image");
    expect(init?.method).toBe("DELETE");
  });

  it("postBankChoiceImage calls /bank-questions/:bid/choices/:index/image with FormData", async () => {
    const mockMeta = { content_type: "image/png", size: 100 };
    mockFetchSuccess(mockMeta, 201);

    const file = new File(["test"], "test.png", { type: "image/png" });
    const result = await postBankChoiceImage("b1", 2, file);
    expect(result).toEqual(mockMeta);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/bank-questions/b1/choices/2/image");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
  });

  it("getBankChoiceImageBlob calls /bank-questions/:bid/choices/:index/image", async () => {
    mockFetchBlob(new Blob(["img"], { type: "image/png" }));

    const result = await getBankChoiceImageBlob("b1", 2);
    expect(result).toBeInstanceOf(Blob);

    const [url] = lastFetchCall();
    expect(url).toBe("/api/bank-questions/b1/choices/2/image");
  });

  it("deleteBankChoiceImage calls /bank-questions/:bid/choices/:index/image", async () => {
    mockFetch204();

    await deleteBankChoiceImage("b1", 2);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/bank-questions/b1/choices/2/image");
    expect(init?.method).toBe("DELETE");
  });
});
