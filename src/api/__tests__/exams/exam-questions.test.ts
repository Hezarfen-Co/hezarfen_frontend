import { afterEach, describe, expect, it, vi } from "vitest";
import { getExamQuestions } from "../../exams";
import { postExamQuestion } from "../../exams";
import { patchExamQuestionById } from "../../exams";
import { deleteExamQuestionById } from "../../exams";
import { postExamQuestionImage } from "../../exams";
import { deleteExamQuestionImage } from "../../exams";
import { postExamChoiceImage } from "../../exams";
import { deleteExamChoiceImage } from "../../exams";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

describe("exams API - questions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getExamQuestions calls /exams/:id/questions", async () => {
    const mockPage = { items: [{ id: "q1" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getExamQuestions("ex1");
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });

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

  it("postExamChoiceImage calls /exams/:id/questions/:qid/choices/:index/image with FormData", async () => {
    const mockMeta = { content_type: "image/png", size: 100 };
    mockFetchSuccess(mockMeta);

    const file = new File(["test"], "test.png", { type: "image/png" });
    const result = await postExamChoiceImage("ex1", "q1", 2, file);
    expect(result).toEqual(mockMeta);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/questions/q1/choices/2/image");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
  });

  it("deleteExamChoiceImage calls /exams/:id/questions/:qid/choices/:index/image", async () => {
    mockFetch204();

    await deleteExamChoiceImage("ex1", "q1", 2);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/questions/q1/choices/2/image");
    expect(init?.method).toBe("DELETE");
  });
});
