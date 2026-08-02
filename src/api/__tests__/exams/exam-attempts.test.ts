import { afterEach, describe, expect, it, vi } from "vitest";
import { getExamAttempt } from "../../exams";
import { postExamAttempt } from "../../exams";
import { postExamAttemptFinish } from "../../exams";
import { getExamAttemptQuestions } from "../../exams";
import { postExamAttemptAnswer } from "../../exams";
import { lastFetchCall, mockFetchSuccess } from "../helpers/mock-fetch";

describe("exams API - attempts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getExamAttempt calls /exams/:id/attempt", async () => {
    const mockAttempt = { id: "a1", status: "in_progress" };
    mockFetchSuccess(mockAttempt);

    const result = await getExamAttempt("ex1");
    expect(result).toEqual(mockAttempt);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/attempt");
    expect(init?.method).toBe("GET");
  });

  it("postExamAttempt calls /exams/:id/attempt (start attempt)", async () => {
    const mockAttempt = { id: "a1", status: "in_progress" };
    mockFetchSuccess(mockAttempt);

    const result = await postExamAttempt("ex1");
    expect(result).toEqual(mockAttempt);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/attempt");
    expect(init?.method).toBe("POST");
  });

  it("postExamAttemptFinish calls /exams/:id/attempt/finish", async () => {
    const mockAttempt = { id: "a1", status: "submitted" };
    mockFetchSuccess(mockAttempt);

    const result = await postExamAttemptFinish("ex1");
    expect(result).toEqual(mockAttempt);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/attempt/finish");
    expect(init?.method).toBe("POST");
  });

  it("getExamAttemptQuestions calls /exams/:id/attempt/questions", async () => {
    const mockQuestions = [{ id: "q1" }];
    mockFetchSuccess(mockQuestions);

    const result = await getExamAttemptQuestions("ex1");
    expect(result).toEqual([{ id: "q1", exam: "ex1" }]);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/attempt/questions");
    expect(init?.method).toBe("GET");
  });

  it("postExamAttemptAnswer calls /exams/:id/attempt/answers with data", async () => {
    const mockAnswer = { selected: "c1" };
    mockFetchSuccess(mockAnswer);

    const data = { question_id: "q1", selected: "c1" };
    const result = await postExamAttemptAnswer("ex1", data);
    expect(result).toEqual(mockAnswer);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/exams/ex1/attempt/answers");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(data));
  });
});
