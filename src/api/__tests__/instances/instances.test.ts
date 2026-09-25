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
  deleteInstanceExamWeightByKind,
  deleteInstanceExamWeights,
  deleteInstanceSubjectById,
  deleteInstanceSubjects,
  deleteInstanceWeeklyPlan,
  deleteInstanceWeeklySlotById,
  getInstanceExamWeights,
  getInstanceSubjects,
  getInstanceWeeklyPlan,
  patchInstanceExamWeight,
  postInstanceReset,
  postInstanceSubject,
  postInstanceWeeklyPlanMaterialize,
  postInstanceWeeklySlot,
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
    const body = { title: "9-A Matematik", description: "Sayısal", ders_saati: 4, counts_toward_karne: false };

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

  it("getInstanceSessions sends the half-open start window when set", async () => {
    mockFetchSuccess({ items: [], total: 0 });

    await getInstanceSessions("i1", { starts_after: 1700000000000, starts_before: 1800000000000, limit: 100 });

    const [url] = lastFetchCall();
    expect(url).toBe("/api/instances/i1/sessions?limit=100&starts_after=1700000000000&starts_before=1800000000000");
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

  // Per-section overrides over the grade-level offering.
  it("postInstanceReset POSTs /instances/i1/reset", async () => {
    mockFetchSuccess({ id: "x1" });
    await postInstanceReset("i1", ["title", "weekly_plan"]);
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/instances/i1/reset");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ fields: ["title", "weekly_plan"] }));
  });

  it("getInstanceSubjects GETs /instances/i1/subjects", async () => {
    mockFetchSuccess({ subjects: [], subjects_inherited: true });
    await getInstanceSubjects("i1");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/instances/i1/subjects");
    expect(init?.method).toBe("GET");
  });

  it("postInstanceSubject POSTs /instances/i1/subjects", async () => {
    mockFetchSuccess({ id: "x1" });
    await postInstanceSubject("i1", "s1");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/instances/i1/subjects");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ subject: "s1" }));
  });

  it("deleteInstanceSubjects DELETEs /instances/i1/subjects", async () => {
    mockFetch204();
    await deleteInstanceSubjects("i1");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/instances/i1/subjects");
    expect(init?.method).toBe("DELETE");
  });

  it("deleteInstanceSubjectById DELETEs /instances/i1/subjects/s1", async () => {
    mockFetch204();
    await deleteInstanceSubjectById("i1", "s1");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/instances/i1/subjects/s1");
    expect(init?.method).toBe("DELETE");
  });

  it("getInstanceWeeklyPlan GETs /instances/i1/weekly-plan", async () => {
    mockFetchSuccess({ weekly_plan: [], weekly_plan_inherited: true });
    await getInstanceWeeklyPlan("i1");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/instances/i1/weekly-plan");
    expect(init?.method).toBe("GET");
  });

  it("postInstanceWeeklySlot POSTs /instances/i1/weekly-plan", async () => {
    mockFetchSuccess({ id: "x1" });
    await postInstanceWeeklySlot("i1", { weekday: 3, starts_at: 600, ends_at: 640 });
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/instances/i1/weekly-plan");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ weekday: 3, starts_at: 600, ends_at: 640 }));
  });

  it("deleteInstanceWeeklyPlan DELETEs /instances/i1/weekly-plan", async () => {
    mockFetch204();
    await deleteInstanceWeeklyPlan("i1");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/instances/i1/weekly-plan");
    expect(init?.method).toBe("DELETE");
  });

  it("deleteInstanceWeeklySlotById DELETEs /instances/i1/weekly-plan/sl1", async () => {
    mockFetch204();
    await deleteInstanceWeeklySlotById("i1", "sl1");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/instances/i1/weekly-plan/sl1");
    expect(init?.method).toBe("DELETE");
  });

  it("postInstanceWeeklyPlanMaterialize POSTs the range as a dry run", async () => {
    mockFetchSuccess({ applied: false, created: [] });
    await postInstanceWeeklyPlanMaterialize("i1", { from: 10, to: 20, apply: false });
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/instances/i1/weekly-plan/materialize");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ from: 10, to: 20, apply: false }));
  });

  it("getInstanceExamWeights GETs /instances/i1/exam-weights", async () => {
    mockFetchSuccess({ inherited: true, weights: [] });
    await getInstanceExamWeights("i1");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/instances/i1/exam-weights");
    expect(init?.method).toBe("GET");
  });

  it("patchInstanceExamWeight PATCHs /instances/i1/exam-weights", async () => {
    mockFetchSuccess({ inherited: false, weights: [] });
    await patchInstanceExamWeight("i1", { kind: "quiz", weight: 10 });
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/instances/i1/exam-weights");
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe(JSON.stringify({ kind: "quiz", weight: 10 }));
  });

  it("deleteInstanceExamWeights DELETEs /instances/i1/exam-weights", async () => {
    mockFetch204();
    await deleteInstanceExamWeights("i1");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/instances/i1/exam-weights");
    expect(init?.method).toBe("DELETE");
  });

  it("deleteInstanceExamWeightByKind DELETEs /instances/i1/exam-weights/quiz", async () => {
    mockFetch204();
    await deleteInstanceExamWeightByKind("i1", "quiz");
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/instances/i1/exam-weights/quiz");
    expect(init?.method).toBe("DELETE");
  });
});
