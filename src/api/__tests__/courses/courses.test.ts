import { afterEach, describe, expect, it, vi } from "vitest";
import { getCourses } from "../../courses";
import { getCourseById } from "../../courses";
import { postCourse } from "../../courses";
import { patchCourseById } from "../../courses";
import { deleteCourseById } from "../../courses";
import { getCourseMembers } from "../../courses";
import { postCourseMember } from "../../courses";
import { deleteCourseMemberByUserId } from "../../courses";
import { getCourseSubjects } from "../../courses";
import { postCourseSubject } from "../../courses";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

describe("courses API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getCourses calls /courses with pagination", async () => {
    const mockPage = { items: [{ id: "c1" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getCourses({ limit: 10 });
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/courses?limit=10");
    expect(init?.method).toBe("GET");
  });

  it("getCourses sends pagination only — the endpoint has no kind/term/search filter", async () => {
    mockFetchSuccess({ items: [], total: 0 });
    await getCourses({ limit: 12, offset: 24 });
    expect(lastFetchCall()[0]).toBe("/api/courses?limit=12&offset=24");
  });

  it("getCourseById calls /courses/:id", async () => {
    const mockCourse = { id: "c1", title: "Course" };
    mockFetchSuccess(mockCourse);

    const result = await getCourseById("c1");
    expect(result).toEqual(mockCourse);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/courses/c1");
    expect(init?.method).toBe("GET");
  });

  it("postCourse calls /courses with data", async () => {
    const mockCourse = { id: "c1" };
    mockFetchSuccess(mockCourse);

    const data = { title: "New Course", description: "Desc", kind: "course" };
    const result = await postCourse(data);
    expect(result).toEqual(mockCourse);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/courses");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(data));
  });

  it("patchCourseById calls /courses/:id with updates", async () => {
    const mockCourse = { id: "c1", title: "Updated" };
    mockFetchSuccess(mockCourse);

    const updates = { title: "Updated" };
    const result = await patchCourseById("c1", updates);
    expect(result).toEqual(mockCourse);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/courses/c1");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(updates));
  });

  it("deleteCourseById calls /courses/:id", async () => {
    mockFetch204();

    await deleteCourseById("c1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/courses/c1");
    expect(init?.method).toBe("DELETE");
  });

  it("getCourseSubjects calls /courses/:id/subjects", async () => {
    const mockPage = { items: [{ id: "sub1" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getCourseSubjects("c1");
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/courses/c1/subjects");
    expect(init?.method).toBe("GET");
  });

  it("postCourseSubject calls /courses/:id/subjects", async () => {
    const mockSub = { id: "sub1", course: "c1" };
    mockFetchSuccess(mockSub);

    const data = { name: "Sub", description: "Desc" };
    const result = await postCourseSubject("c1", data);
    expect(result).toEqual(mockSub);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/courses/c1/subjects");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(data));
  });

  it("getCourseMembers calls /courses/:id/members with pagination", async () => {
    mockFetchSuccess({ items: [{ id: "m1" }], total: 1 });

    const result = await getCourseMembers("c1", { limit: 10 });
    expect(result.items).toEqual([{ id: "m1" }]);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/courses/c1/members?limit=10");
    expect(init?.method).toBe("GET");
  });

  it("postCourseMember calls /courses/:id/members with the user id", async () => {
    mockFetchSuccess({ id: "m1" });

    await postCourseMember("c1", "u1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/courses/c1/members");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ user_id: "u1" }));
  });

  it("deleteCourseMemberByUserId calls /courses/:id/members/:userId", async () => {
    mockFetch204();

    await deleteCourseMemberByUserId("c1", "u1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/courses/c1/members/u1");
    expect(init?.method).toBe("DELETE");
  });

});
