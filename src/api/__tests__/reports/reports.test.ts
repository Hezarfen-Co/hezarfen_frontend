import { afterEach, describe, expect, it, vi } from "vitest";
import { getMyCourses } from "../../reports";
import { getMyAttendance } from "../../reports";
import { getMyMarks } from "../../reports";
import { getUserAttendance } from "../../reports";
import { getUserMarks } from "../../reports";
import { getMyKarne } from "../../reports";
import { getUserKarne } from "../../reports";
import { lastFetchCall, mockFetchSuccess } from "../helpers/mock-fetch";

describe("reports API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getMyCourses calls /courses/me", async () => {
    const mockCourses = [{ id: "c1" }];
    mockFetchSuccess(mockCourses);

    const result = await getMyCourses();
    expect(result).toEqual({ items: mockCourses, limit: null, offset: 0, total: 1 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/courses/me");
    expect(init?.method).toBe("GET");
  });

  it("getMyCourses sends pagination only — /courses/me takes no filters", async () => {
    mockFetchSuccess({ items: [], total: 0 });
    await getMyCourses({ limit: 5 });
    expect(lastFetchCall()[0]).toBe("/api/courses/me?limit=5");
  });

  it("getMyAttendance calls /attendance/me", async () => {
    const mockAttendance = { courses: [] };
    mockFetchSuccess(mockAttendance);

    const result = await getMyAttendance();
    expect(result).toEqual(mockAttendance);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/attendance/me");
    expect(init?.method).toBe("GET");
  });

  it("getMyMarks calls /marks/me", async () => {
    const mockMarks = { courses: [] };
    mockFetchSuccess(mockMarks);

    const result = await getMyMarks();
    expect(result).toEqual(mockMarks);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/marks/me");
    expect(init?.method).toBe("GET");
  });

  it("getUserAttendance calls /attendance/users/:id", async () => {
    const mockAttendance = { courses: [] };
    mockFetchSuccess(mockAttendance);

    const result = await getUserAttendance("u1");
    expect(result).toEqual(mockAttendance);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/attendance/u1");
    expect(init?.method).toBe("GET");
  });

  it("getUserMarks calls /marks/users/:id", async () => {
    const mockMarks = { courses: [] };
    mockFetchSuccess(mockMarks);

    const result = await getUserMarks("u1");
    expect(result).toEqual(mockMarks);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/marks/u1");
    expect(init?.method).toBe("GET");
  });
  it("getMyKarne calls /marks/karne without a term", async () => {
    mockFetchSuccess({ user: "u1", term: "t1", instances: [] });

    await getMyKarne();

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/marks/karne");
    expect(init?.method).toBe("GET");
  });

  it("getMyKarne passes the term through as a query", async () => {
    mockFetchSuccess({ user: "u1", term: "t 1", instances: [] });

    await getMyKarne("t 1");

    const [url] = lastFetchCall();
    expect(url).toBe("/api/marks/karne?term=t%201");
  });

  it("getUserKarne calls /marks/karne/:user with the term", async () => {
    mockFetchSuccess({ user: "u2", term: "t1", instances: [] });

    await getUserKarne("u2", "t1");

    const [url] = lastFetchCall();
    expect(url).toBe("/api/marks/karne/u2?term=t1");
  });

});
