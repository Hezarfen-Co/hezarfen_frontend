import { afterEach, describe, expect, it, vi } from "vitest";
import { getMyCourses } from "../../getMyCourses";
import { getMyAttendance } from "../../getMyAttendance";
import { getMyMarks } from "../../getMyMarks";
import { getUserAttendance } from "../../getUserAttendance";
import { getUserMarks } from "../../getUserMarks";
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
});
