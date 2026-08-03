import { afterEach, describe, expect, it, vi } from "vitest";
import { getCourses } from "../../courses";
import { getCourseById } from "../../courses";
import { postCourse } from "../../courses";
import { patchCourseById } from "../../courses";
import { deleteCourseById } from "../../courses";
import { getCourseEnrollments } from "../../courses";
import { postCourseEnrollment } from "../../courses";
import { deleteCourseEnrollmentByUserId } from "../../courses";
import { getCourseSessions } from "../../courses";
import { postCourseSession } from "../../courses";
import { getCourseSubjects } from "../../courses";
import { postCourseSubject } from "../../courses";
import { getCourseExams } from "../../courses";
import { postCourseExam } from "../../courses";
import { postCourseTeacher } from "../../courses";
import { deleteCourseTeacherByUserId } from "../../courses";
import { getCourseHomework } from "../../courses";
import { postCourseHomework } from "../../courses";
import { lastFetchCall, mockFetch204, mockFetchSuccess } from "../helpers/mock-fetch";

describe("courses API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("postCourseTeacher calls /courses/:id/teachers", async () => {
    const mockCourse = { id: "c1", title: "Course", teachers: [{ id: "t1", username: "teacher1", display_name: "Teacher 1" }] };
    mockFetchSuccess(mockCourse);

    const result = await postCourseTeacher("c1", "t1");
    expect(result).toEqual(mockCourse);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/courses/c1/teachers");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ user_id: "t1" }));
  });

  it("deleteCourseTeacherByUserId calls /courses/:id/teachers/:userId", async () => {
    mockFetch204();

    await deleteCourseTeacherByUserId("c1", "t1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/courses/c1/teachers/t1");
    expect(init?.method).toBe("DELETE");
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

  it("getCourseEnrollments calls /courses/:id/enrollments", async () => {
    const mockPage = { items: [{ id: "en1" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getCourseEnrollments("c1");
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/courses/c1/enrollments");
    expect(init?.method).toBe("GET");
  });

  it("postCourseEnrollment calls /courses/:id/enrollments", async () => {
    const mockEnr = { id: "en1", course: "c1" };
    mockFetchSuccess(mockEnr);

    const result = await postCourseEnrollment("c1", "u1");
    expect(result).toEqual(mockEnr);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/courses/c1/enrollments");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ user_id: "u1" }));
  });

  it("deleteCourseEnrollmentByUserId calls /courses/:id/enrollments/:userId", async () => {
    mockFetch204();

    await deleteCourseEnrollmentByUserId("c1", "u1");

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/courses/c1/enrollments/u1");
    expect(init?.method).toBe("DELETE");
  });

  it("getCourseSessions calls /courses/:id/sessions", async () => {
    const mockPage = { items: [{ id: "s1" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getCourseSessions("c1");
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/courses/c1/sessions");
    expect(init?.method).toBe("GET");
  });

  it("postCourseSession calls /courses/:id/sessions", async () => {
    const mockSession = { id: "s1", course: "c1" };
    mockFetchSuccess(mockSession);

    const data = { topic: "Topic", starts_at: 1000 };
    const result = await postCourseSession("c1", data);
    expect(result).toEqual(mockSession);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/courses/c1/sessions");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(data));
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

  it("getCourseExams calls /courses/:id/exams", async () => {
    const mockPage = { items: [{ id: "ex1" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getCourseExams("c1");
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/courses/c1/exams");
    expect(init?.method).toBe("GET");
  });

  it("postCourseExam calls /courses/:id/exams", async () => {
    const mockExam = { id: "ex1", course: "c1" };
    mockFetchSuccess(mockExam);

    const data = { title: "Exam", kind: "quiz" };
    const result = await postCourseExam("c1", data);
    expect(result).toEqual(mockExam);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/courses/c1/exams");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(data));
  });

  it("getCourseHomework calls /courses/:id/homework", async () => {
    const mockPage = { items: [{ id: "hw1" }], total: 1 };
    mockFetchSuccess(mockPage);

    const result = await getCourseHomework("c1", { limit: 5 });
    expect(result).toEqual({ ...mockPage, limit: null, offset: 0 });

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/courses/c1/homework?limit=5");
    expect(init?.method).toBe("GET");
  });

  it("postCourseHomework calls /courses/:id/homework", async () => {
    const mockHomework = { id: "hw1", course: "c1" };
    mockFetchSuccess(mockHomework);

    const data = { title: "HW", subject_id: "sub1", due_at: 1900000000000, assigned: ["u1"] };
    const result = await postCourseHomework("c1", data);
    expect(result).toEqual(mockHomework);

    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/courses/c1/homework");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify(data));
  });
});
