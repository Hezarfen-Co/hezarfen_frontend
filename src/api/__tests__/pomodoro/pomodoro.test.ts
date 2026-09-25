import { afterEach, describe, expect, it, vi } from "vitest";
import { getPomodoroMe } from "../../pomodoro";
import { getPomodoroByUser } from "../../pomodoro";
import { postPomodoroStart } from "../../pomodoro";
import { postPomodoroFinish } from "../../pomodoro";
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

  it("getPomodoroMe serializes the from/to window next to pagination", async () => {
    mockFetchSuccess({ items: [], total: 0, limit: 400, offset: 0, total_focus_ms: 0 });

    await getPomodoroMe({ limit: 400, offset: 0, from: 1000, to: 2000 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/pomodoro/me?limit=400&offset=0&from=1000&to=2000");
    expect(init?.method).toBe("GET");
  });

  it("getPomodoroMe sends only the bounds that are set", async () => {
    mockFetchSuccess({ items: [], total: 0, limit: null, offset: 0, total_focus_ms: 0 });

    await getPomodoroMe({ from: 1000 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/pomodoro/me?from=1000");
    expect(init?.method).toBe("GET");
  });

  it("getPomodoroMe sends a bare URL without any params", async () => {
    mockFetchSuccess({ items: [], total: 0, limit: null, offset: 0, total_focus_ms: 0 });

    await getPomodoroMe();

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/pomodoro/me");
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
    expect(init?.body).toBeUndefined();
  });

  it("postPomodoroStart sends the optional session label", async () => {
    mockFetchSuccess({ id: "p1", label: "Calculus" });

    await postPomodoroStart({ label: "Calculus" });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/pomodoro/start");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ label: "Calculus" }));
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
