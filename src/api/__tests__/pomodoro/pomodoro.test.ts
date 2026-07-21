import { afterEach, describe, expect, it, vi } from "vitest";
import { getPomodoroMe } from "../../getPomodoroMe";
import { getPomodoroByUser } from "../../getPomodoroByUser";
import { postPomodoroStart } from "../../postPomodoroStart";
import { postPomodoroFinish } from "../../postPomodoroFinish";
import { lastFetchCall, mockFetchSuccess } from "../helpers/mock-fetch";

describe("pomodoro API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getPomodoroMe calls /pomodoro/me with pagination", async () => {
    const mockLog = { items: [{ id: "p1" }], total: 1, limit: 10, offset: 0, total_focus_ms: 1000 };
    mockFetchSuccess(mockLog);

    const result = await getPomodoroMe({ limit: 10 });
    expect(result).toEqual(mockLog); // PomodoroLog is not normalized by normalizePage

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/pomodoro/me?limit=10");
    expect(init?.method).toBe("GET");
  });

  it("getPomodoroByUser calls /pomodoro/users/:id with pagination", async () => {
    const mockLog = { items: [{ id: "p1" }], total: 1, limit: 10, offset: 0, total_focus_ms: 1000 };
    mockFetchSuccess(mockLog);

    const result = await getPomodoroByUser("u1", { limit: 10 });
    expect(result).toEqual(mockLog);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/pomodoro/u1?limit=10");
    expect(init?.method).toBe("GET");
  });

  it("postPomodoroStart calls /pomodoro/start", async () => {
    const mockSession = { id: "p1" };
    mockFetchSuccess(mockSession);

    const result = await postPomodoroStart();
    expect(result).toEqual(mockSession);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/pomodoro/start");
    expect(init?.method).toBe("POST");
  });

  it("postPomodoroFinish calls /pomodoro/finish", async () => {
    const mockSession = { id: "p1", finished_at: 2000 };
    mockFetchSuccess(mockSession);

    const result = await postPomodoroFinish();
    expect(result).toEqual(mockSession);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/pomodoro/finish");
    expect(init?.method).toBe("POST");
  });
});
