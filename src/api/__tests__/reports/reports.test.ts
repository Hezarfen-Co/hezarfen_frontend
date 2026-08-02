import { afterEach, describe, expect, it, vi } from "vitest";
import { getMyCourses } from "../../reports";
import { getMyAttendance } from "../../reports";
import { getMyMarks } from "../../reports";
import { getUserAttendance } from "../../reports";
import { getUserMarks } from "../../reports";
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

  it("getMyCourses sends course filters", async () => {
    mockFetchSuccess({ items: [], total: 0 });
    await getMyCourses({ kind: "club", q: "robot", term_id: "t1" });
    expect(lastFetchCall()[0]).toBe("/api/courses/me?kind=club&q=robot&term_id=t1");
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
