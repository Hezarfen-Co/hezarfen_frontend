import { afterEach, describe, expect, it, vi } from "vitest";
import { getExams } from "../../exams";
import { getExamById } from "../../exams";
import { patchExamById } from "../../exams";
import { deleteExamById } from "../../exams";
import { getExamQuestionImageBlob } from "../../exams";
import { postExamAttemptAnswerImage } from "../../exams";
import { deleteExamAttemptAnswerImage } from "../../exams";
import { getExamAnswerImageBlob } from "../../exams";
import { lastFetchCall, mockFetch204, mockFetchBlob, mockFetchSuccess } from "../helpers/mock-fetch";

describe("exams API - core", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getExams calls /exams with pagination", async () => {
    const mockPage = { items: [{ id: "ex1" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getExams({ limit: 10 });
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams?limit=10");
    expect(init?.method).toBe("GET");
  });

  it("getExamById calls /exams/:id", async () => {
    const mockExam = { id: "ex1", title: "Exam" };
    mockFetchSuccess(mockExam);

    const result = await getExamById("ex1");
    expect(result).toEqual(mockExam);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1");
    expect(init?.method).toBe("GET");
  });

  it("patchExamById calls /exams/:id with updates", async () => {
    const mockExam = { id: "ex1", title: "Updated" };
    mockFetchSuccess(mockExam);

    const updates = { title: "Updated" };
    const result = await patchExamById("ex1", updates);
    expect(result).toEqual(mockExam);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(updates));
  });

  it("deleteExamById calls /exams/:id", async () => {
    mockFetch204();

    await deleteExamById("ex1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1");
    expect(init?.method).toBe("DELETE");
  });

  it("getExamQuestionImageBlob fetches the question image blob", async () => {
    const blob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" });
    mockFetchBlob(blob);

    const result = await getExamQuestionImageBlob("ex1", "q1");
    expect(result).toBeInstanceOf(Blob);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/questions/q1/image");
    expect(init?.method ?? "GET").toBe("GET");
    expect(init?.credentials).toBe("same-origin");
  });

  it("postExamAttemptAnswerImage calls /exams/:id/attempt/answers/:qid/image with FormData", async () => {
    const mockMeta = { content_type: "image/png", size: 100 };
    mockFetchSuccess(mockMeta);

    const file = new File(["test"], "answer.png", { type: "image/png" });
    const result = await postExamAttemptAnswerImage("ex1", "q1", file);
    expect(result).toEqual(mockMeta);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/attempt/answers/q1/image");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
    expect((init?.body as FormData).get("file")).toBe(file);
  });

  it("deleteExamAttemptAnswerImage calls /exams/:id/attempt/answers/:qid/image", async () => {
    mockFetch204();

    await deleteExamAttemptAnswerImage("ex1", "q1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/attempt/answers/q1/image");
    expect(init?.method).toBe("DELETE");
  });

  it("getExamAnswerImageBlob fetches the student's own answer image blob", async () => {
    const blob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" });
    mockFetchBlob(blob);

    const result = await getExamAnswerImageBlob("ex1", "q1");
    expect(result).toBeInstanceOf(Blob);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/attempt/answers/q1/image");
    expect(init?.method ?? "GET").toBe("GET");
    expect(init?.credentials).toBe("same-origin");
  });
});
