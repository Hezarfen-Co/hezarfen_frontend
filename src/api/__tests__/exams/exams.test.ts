import { afterEach, describe, expect, it, vi } from "vitest";
import { getExams } from "../../exams";
import { getExamById } from "../../exams";
import { patchExamById } from "../../exams";
import { deleteExamById } from "../../exams";
import { getExamQuestionImageBlob } from "../../exams";
import { getExamChoiceImageBlob } from "../../exams";
import { postExamAttemptAnswerImage } from "../../exams";
import { deleteExamAttemptAnswerImage } from "../../exams";
import { getExamAnswerImageBlob } from "../../exams";
import { getExamAudience } from "../../exams";
import { postExamAudience } from "../../exams";
import { deleteExamAudienceByInstanceId } from "../../exams";
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

  it("getExams sends the schedule window and drops undefined params", async () => {
    mockFetchSuccess({ items: [{ id: "ex1" }], total: 1 });

    await getExams({ ends_after: 1_700_000_000_000, limit: 50 });
    expect(lastFetchCall()[0]).toBe("/api/exams?limit=50&ends_after=1700000000000");

    mockFetchSuccess({ items: [], total: 0 });
    await getExams({ starts_after: 1_700_000_000_000 });
    expect(lastFetchCall()[0]).toBe("/api/exams?starts_after=1700000000000");

    // A blank value (`?ends_after=`) is a hard 400 server-side, so an
    // undefined filter must leave the key out of the query string entirely.
    mockFetchSuccess({ items: [], total: 0 });
    await getExams({ limit: 10, ends_after: undefined, starts_after: undefined });
    expect(lastFetchCall()[0]).toBe("/api/exams?limit=10");
    expect(lastFetchCall()[0]).not.toContain("ends_after");
    expect(lastFetchCall()[0]).not.toContain("starts_after");

    // Upper bounds serialize after the earlier keys, in declaration order.
    mockFetchSuccess({ items: [], total: 0 });
    await getExams({ starts_after: 1, ends_after: 2, starts_before: 3, ends_before: 4 });
    expect(lastFetchCall()[0]).toBe("/api/exams?starts_after=1&ends_after=2&starts_before=3&ends_before=4");

    mockFetchSuccess({ items: [], total: 0 });
    await getExams({ limit: 10, starts_before: undefined, ends_before: undefined });
    expect(lastFetchCall()[0]).toBe("/api/exams?limit=10");
    expect(lastFetchCall()[0]).not.toContain("starts_before");
    expect(lastFetchCall()[0]).not.toContain("ends_before");
  });

  it("getExamChoiceImageBlob calls /exams/:id/questions/:qid/choices/:choiceId/image", async () => {
    mockFetchBlob(new Blob(["img"], { type: "image/png" }));

    const result = await getExamChoiceImageBlob("ex1", "q1", "c2");
    expect(result).toBeInstanceOf(Blob);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/questions/q1/choices/c2/image");
    expect(init?.method).toBeUndefined();
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
  it("getExamAudience reads the whole audience array", async () => {
    mockFetchSuccess([{ instance: "i1", class: "c1", course: "co1" }]);

    const audience = await getExamAudience("x1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/x1/audience");
    expect(init?.method ?? "GET").toBe("GET");
    expect(audience).toEqual([{ instance: "i1", class: "c1", course: "co1" }]);
  });

  it("postExamAudience announces the exam and returns the audience after the write", async () => {
    const after = [
      { instance: "i1", class: "c1", course: "co1" },
      { instance: "i2", class: "c2", course: "co1" },
    ];
    mockFetchSuccess(after);

    const audience = await postExamAudience("x1", "i2");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/x1/audience");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ instance: "i2" }));
    expect(audience).toEqual(after);
  });

  it("deleteExamAudienceByInstanceId withdraws one instance and returns what is left", async () => {
    mockFetchSuccess([{ instance: "i1", class: "c1", course: "co1" }]);

    const audience = await deleteExamAudienceByInstanceId("x1", "i2");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/x1/audience/i2");
    expect(init?.method).toBe("DELETE");
    expect(audience).toHaveLength(1);
  });

});
