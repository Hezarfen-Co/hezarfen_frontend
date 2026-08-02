import { afterEach, describe, expect, it, vi } from "vitest";
import {
  postClass,
  getClasses,
  getClassById,
  patchClassById,
  deleteClassById,
  postClassMember,
  getClassMembers,
  deleteClassMember,
  postClassCourse,
  getClassCourses,
  deleteClassCourse,
} from "../../classes";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

describe("classes API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("postClass POSTs /classes with the body", async () => {
    mockFetchSuccess({ id: "c1" });
    const body = { name: "9-A", grade: "9", term_id: "t1" };
    await postClass(body);
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/classes");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(body));
  });

  it("getClasses GETs /classes with pagination", async () => {
    mockFetchSuccess({ items: [{ id: "c1" }], total: 1 });
    await getClasses({ limit: 5, offset: 10 });
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/classes?limit=5&offset=10");
    expect(init?.method ?? "GET").toBe("GET");
  });

  it("getClassById GETs /classes/:id", async () => {
    mockFetchSuccess({ id: "c1" });
    await getClassById("c1");
    const [url] = lastFetchCall();
    expect(url).toBe("/api/classes/c1");
  });

  it("patchClassById PATCHes /classes/:id with the body", async () => {
    mockFetchSuccess({ id: "c1" });
    const body = { name: "9-B", grade: null, term_id: null };
    await patchClassById("c1", body);
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/classes/c1");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(body));
  });

  it("deleteClassById DELETEs /classes/:id", async () => {
    mockFetch204();
    await deleteClassById("c1");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/classes/c1");
    expect(init?.method).toBe("DELETE");
  });

  it("postClassMember POSTs /classes/:id/members with the body", async () => {
    mockFetchSuccess({ id: "m1" });
    const body = { user_id: "u1" };
    await postClassMember("c1", body);
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/classes/c1/members");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(body));
  });

  it("getClassMembers GETs /classes/:id/members with pagination", async () => {
    mockFetchSuccess({ items: [], total: 0 });
    await getClassMembers("c1", { limit: 5, offset: 10 });
    const [url] = lastFetchCall();
    expect(url).toBe("/api/classes/c1/members?limit=5&offset=10");
  });

  it("deleteClassMember DELETEs /classes/:id/members/:user", async () => {
    mockFetch204();
    await deleteClassMember("c1", "u1");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/classes/c1/members/u1");
    expect(init?.method).toBe("DELETE");
  });

  it("postClassCourse POSTs /classes/:id/courses with the body", async () => {
    mockFetchSuccess({ id: "cc1" });
    const body = { course_id: "co1" };
    await postClassCourse("c1", body);
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/classes/c1/courses");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(body));
  });

  it("getClassCourses GETs /classes/:id/courses with pagination", async () => {
    mockFetchSuccess({ items: [], total: 0 });
    await getClassCourses("c1", { limit: 5, offset: 10 });
    const [url] = lastFetchCall();
    expect(url).toBe("/api/classes/c1/courses?limit=5&offset=10");
  });

  it("deleteClassCourse DELETEs /classes/:id/courses/:course", async () => {
    mockFetch204();
    await deleteClassCourse("c1", "co1");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/classes/c1/courses/co1");
    expect(init?.method).toBe("DELETE");
  });
});
