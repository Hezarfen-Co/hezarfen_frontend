import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deleteInstanceEnrollmentByUserId,
  deleteInstanceTeacherByUserId,
  getInstanceById,
  getInstanceEnrollments,
  getInstanceExams,
  getInstanceHomework,
  getInstanceSessions,
  getMyInstances,
  patchInstanceById,
  postInstanceEnrollment,
  postInstanceExam,
  postInstanceHomework,
  postInstanceSession,
  postInstanceTeacher,
} from "../../instances";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

describe("instances API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getMyInstances GETs /instances/me with pagination", async () => {
    mockFetchSuccess({ items: [{ id: "i1" }], total: 1 });

    const result = await getMyInstances({ limit: 20, offset: 40 });
    expect(result.items).toEqual([{ id: "i1" }]);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/instances/me?limit=20&offset=40");
    expect(init?.method).toBe("GET");
  });

  it("getInstanceById GETs /instances/:id", async () => {
    mockFetchSuccess({ id: "i1" });

    await getInstanceById("i1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/instances/i1");
    expect(init?.method).toBe("GET");
  });

  it("patchInstanceById PATCHes /instances/:id with the policy body", async () => {
    mockFetchSuccess({ id: "i1" });
    const body = { ders_saati: 4, counts_toward_karne: false };

    await patchInstanceById("i1", body);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/instances/i1");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify(body));
  });

  it("getInstanceEnrollments GETs /instances/:id/enrollments with pagination", async () => {
    mockFetchSuccess({ items: [], total: 0 });

    await getInstanceEnrollments("i1", { limit: 5 });

    const [url] = lastFetchCall();
    expect(url).toBe("/api/instances/i1/enrollments?limit=5");
  });

  it("postInstanceEnrollment POSTs /instances/:id/enrollments with the user id", async () => {
    mockFetchSuccess({ id: "e1" });

    await postInstanceEnrollment("i1", "u1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/instances/i1/enrollments");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ user_id: "u1" }));
  });

  it("deleteInstanceEnrollmentByUserId DELETEs /instances/:id/enrollments/:user", async () => {
    mockFetch204();

    await deleteInstanceEnrollmentByUserId("i1", "u1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/instances/i1/enrollments/u1");
    expect(init?.method).toBe("DELETE");
  });

  it("getInstanceExams GETs /instances/:id/exams", async () => {
    mockFetchSuccess({ items: [], total: 0 });

    await getInstanceExams("i1");

    const [url] = lastFetchCall();
    expect(url).toBe("/api/instances/i1/exams");
  });

  it("postInstanceExam POSTs /instances/:id/exams with the term", async () => {
    mockFetchSuccess({ id: "x1" });
    const body = { title: "Quiz 1", kind: "quiz", term: "t1" };

    await postInstanceExam("i1", body);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/instances/i1/exams");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(body));
  });

  it("getInstanceHomework GETs /instances/:id/homework", async () => {
    mockFetchSuccess({ items: [], total: 0 });

    await getInstanceHomework("i1");

    const [url] = lastFetchCall();
    expect(url).toBe("/api/instances/i1/homework");
  });

  it("postInstanceHomework POSTs /instances/:id/homework with the body", async () => {
    mockFetchSuccess({ id: "h1" });
    const body = { title: "Read ch. 3", subject_id: "s1", due_at: 1900000000000 };

    await postInstanceHomework("i1", body);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/instances/i1/homework");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(body));
  });

  it("getInstanceSessions GETs /instances/:id/sessions", async () => {
    mockFetchSuccess({ items: [], total: 0 });

    await getInstanceSessions("i1");

    const [url] = lastFetchCall();
    expect(url).toBe("/api/instances/i1/sessions");
  });

  it("postInstanceSession POSTs /instances/:id/sessions with the body", async () => {
    mockFetchSuccess({ id: "se1" });
    const body = { starts_at: 1900000000000, topic: "Limits" };

    await postInstanceSession("i1", body);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/instances/i1/sessions");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(body));
  });

  it("postInstanceTeacher POSTs /instances/:id/teachers with the user id", async () => {
    mockFetchSuccess({ id: "i1" });

    await postInstanceTeacher("i1", "t1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/instances/i1/teachers");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ user_id: "t1" }));
  });

  it("deleteInstanceTeacherByUserId DELETEs /instances/:id/teachers/:user", async () => {
    mockFetch204();

    await deleteInstanceTeacherByUserId("i1", "t1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/instances/i1/teachers/t1");
    expect(init?.method).toBe("DELETE");
  });
});
