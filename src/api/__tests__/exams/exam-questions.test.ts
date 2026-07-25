import { afterEach, describe, expect, it, vi } from "vitest";
import { getExamQuestions } from "../../exams";
import { postExamQuestion } from "../../exams";
import { patchExamQuestionById } from "../../exams";
import { deleteExamQuestionById } from "../../exams";
import { postExamQuestionImage } from "../../exams";
import { deleteExamQuestionImage } from "../../exams";
import { postExamChoiceImage } from "../../exams";
import { deleteExamChoiceImage } from "../../exams";
import { postExamQuestionFromBank } from "../../exams";
import { postExamQuestionRefreshFromBank } from "../../exams";
import { postExamQuestionToBank } from "../../exams";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

describe("exams API - questions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getExamQuestions calls /exams/:id/questions", async () => {
    // Both provenance links ride the list untouched: `from_bank` (added out of
    // the bank) and `banked_as` (a template minted by saving this question).
    const mockPage = { items: [{ id: "q1", from_bank: "b1", banked_as: "b2" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getExamQuestions("ex1");
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });
    expect(result.items[0].from_bank).toBe("b1");
    expect(result.items[0].banked_as).toBe("b2");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/questions");
    expect(init?.method).toBe("GET");
  });

  it("postExamQuestion calls /exams/:id/questions with data", async () => {
    const mockQuestion = { id: "q1" };
    mockFetchSuccess(mockQuestion);

    const data = { subject: "sub1", text: "Q?", kind: "choice" as const, points: 10 };
    const result = await postExamQuestion("ex1", data);
    expect(result).toEqual(mockQuestion);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/questions");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(data));
  });

  it("patchExamQuestionById calls /exams/:id/questions/:qid with updates", async () => {
    const mockQuestion = { id: "q1", text: "Updated" };
    mockFetchSuccess(mockQuestion);

    const updates = { text: "Updated" };
    const result = await patchExamQuestionById("ex1", "q1", updates);
    expect(result).toEqual(mockQuestion);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/questions/q1");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(updates));
  });

  it("deleteExamQuestionById calls /exams/:id/questions/:qid", async () => {
    mockFetch204();

    await deleteExamQuestionById("ex1", "q1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/questions/q1");
    expect(init?.method).toBe("DELETE");
  });

  it("postExamQuestionImage calls /exams/:id/questions/:qid/image with FormData", async () => {
    const mockMeta = { content_type: "image/png", size: 100 };
    mockFetchSuccess(mockMeta);

    const file = new File(["test"], "test.png", { type: "image/png" });
    const result = await postExamQuestionImage("ex1", "q1", file);
    expect(result).toEqual(mockMeta);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/questions/q1/image");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
  });

  it("deleteExamQuestionImage calls /exams/:id/questions/:qid/image", async () => {
    mockFetch204();

    await deleteExamQuestionImage("ex1", "q1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/questions/q1/image");
    expect(init?.method).toBe("DELETE");
  });

  it("postExamChoiceImage calls /exams/:id/questions/:qid/choices/:choiceId/image with FormData", async () => {
    const mockMeta = { content_type: "image/png", size: 100 };
    mockFetchSuccess(mockMeta);

    const file = new File(["test"], "test.png", { type: "image/png" });
    const result = await postExamChoiceImage("ex1", "q1", "c2", file);
    expect(result).toEqual(mockMeta);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/questions/q1/choices/c2/image");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
  });

  it("deleteExamChoiceImage calls /exams/:id/questions/:qid/choices/:choiceId/image", async () => {
    mockFetch204();

    await deleteExamChoiceImage("ex1", "q1", "c2");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/questions/q1/choices/c2/image");
    expect(init?.method).toBe("DELETE");
  });

  it("postExamQuestionFromBank calls /exams/:id/questions/from-bank/:bid with subject_id", async () => {
    // Provenance is two separate fields: coming *from* the bank leaves
    // `banked_as` null, so the UI can't claim the question was saved to it.
    const mockQuestion = { id: "q9", from_bank: "b1", banked_as: null };
    mockFetchSuccess(mockQuestion, 201);

    const result = await postExamQuestionFromBank("ex1", "b1", "sub1");
    expect(result).toEqual(mockQuestion);
    expect(result.from_bank).toBe("b1");
    expect(result.banked_as).toBeNull();

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/questions/from-bank/b1");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ subject_id: "sub1" }));
  });

  it("postExamQuestionToBank calls /exams/:id/questions/:qid/to-bank with no body", async () => {
    const mockBankQuestion = { id: "b1", source_exam: "ex1" };
    mockFetchSuccess(mockBankQuestion, 201);

    const result = await postExamQuestionToBank("ex1", "q1");
    expect(result).toEqual(mockBankQuestion);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/questions/q1/to-bank");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeUndefined();
  });

  it("postExamQuestionRefreshFromBank calls /exams/:id/questions/:qid/refresh-from-bank with no body", async () => {
    // The question keeps its id and its `from_bank` link; only the content is
    // re-copied from the template.
    const mockQuestion = { id: "q1", text: "fixed in the template", from_bank: "b1" };
    mockFetchSuccess(mockQuestion);

    const result = await postExamQuestionRefreshFromBank("ex1", "q1");
    expect(result).toEqual(mockQuestion);
    expect(result.from_bank).toBe("b1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/questions/q1/refresh-from-bank");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeUndefined();
  });
});
