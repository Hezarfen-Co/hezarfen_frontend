import { api, configuredExamKind, contractBaseUrl, expectPage, isLive, json, loginAdmin, SKIP_MESSAGE } from "./helpers/live-client";

if (!isLive) console.warn(SKIP_MESSAGE);

describe.skipIf(!isLive)(`learning contract @ ${contractBaseUrl}`, () => {
  let yearId = "";
  let termId = "";
  let classId = "";
  let courseId = "";
  let instanceId = "";
  let examId = "";

  // A catalog course teaches nobody on its own: the chain an exam needs is
  // academic year → dönem → şube → attach the course (which mints the
  // instance) → exam inside that instance.
  beforeAll(async () => {
    await loginAdmin();
    const tag = `contract-learning-${Date.now()}`;

    const year = await json<{ id: string }>("/academic-years", {
      method: "POST",
      body: { name: tag, starts_at: Date.now(), ends_at: Date.now() + 300 * 24 * 60 * 60 * 1000 },
    });
    yearId = year.id;

    const term = await json<{ id: string; year: string }>("/terms", {
      method: "POST",
      body: { name: tag, year: yearId, starts_at: Date.now(), ends_at: Date.now() + 120 * 24 * 60 * 60 * 1000 },
    });
    termId = term.id;
    expect(term.year).toBe(yearId);

    // POST /classes answers with a create envelope, not the bare şube: its
    // `class` is the row, and `skipped` is the pair report (empty here).
    const created = await json<{ class: { id: string }; skipped: unknown[] }>("/classes", {
      method: "POST",
      body: { name: tag, grade_level: 9, year: yearId },
    });
    classId = created.class.id;
    expect(Array.isArray(created.skipped)).toBe(true);

    const course = await json<{ id: string; title: string; kind: string }>("/courses", {
      method: "POST",
      body: { title: tag, kind: "course" },
    });
    courseId = course.id;
    expect(course).toMatchObject({ title: tag, kind: "course" });

    const instance = await json<{ id: string; class: string; course: string }>(`/classes/${classId}/instances`, {
      method: "POST",
      body: { course_id: courseId },
    });
    instanceId = instance.id;
    expect(instance).toMatchObject({ class: classId, course: courseId });
  });

  // Teardown runs inside-out: an instance holds the exams, a şube holds the
  // instance, and a year refuses deletion while a dönem or şube still links it.
  afterAll(async () => {
    if (instanceId) await api(`/classes/${classId}/instances/${instanceId}`, { method: "DELETE" });
    if (courseId) await api(`/courses/${courseId}`, { method: "DELETE" });
    if (classId) await api(`/classes/${classId}`, { method: "DELETE" });
    if (termId) await api(`/terms/${termId}`, { method: "DELETE" });
    if (yearId) await api(`/academic-years/${yearId}`, { method: "DELETE" });
  });

  // `/courses` takes limit/offset only — kind/search filtering is the caller's
  // job, so this asserts the envelope, not a server-side filter.
  it("returns courses through the standard page envelope", async () => {
    const page = await json<{ items: Array<{ id: string }> }>(`/courses?limit=10`);
    expectPage(page);
    expect(page.items.some((course) => course.id === courseId)).toBe(true);
  });

  it("lists the instances a class carries", async () => {
    const page = await json<{ items: Array<{ id: string }> }>(`/classes/${classId}/instances?limit=10`);
    expectPage(page);
    expect(page.items.some((instance) => instance.id === instanceId)).toBe(true);
  });

  it("supports course subjects and exam-question lists", async () => {
    const subject = await json<{ id: string; course: string }>(`/courses/${courseId}/subjects`, {
      method: "POST",
      body: { name: "contract subject" },
    });
    expect(subject.course).toBe(courseId);

    const examKind = await configuredExamKind();
    const exam = await json<{ id: string; class_course: string; term: string; draft: boolean }>(
      `/instances/${instanceId}/exams`,
      {
        method: "POST",
        body: { title: "contract exam", kind: examKind, term: termId, draft: true },
      },
    );
    examId = exam.id;
    expect(exam.class_course).toBe(instanceId);
    expect(exam.term).toBe(termId);

    const question = await json<{ id: string; exam: string }>(`/exams/${examId}/questions`, {
      method: "POST",
      body: { subject_id: subject.id, text: "Contract question", kind: "text", points: 1 },
    });
    expect(question.exam).toBe(examId);
    expectPage(await json(`/exams/${examId}/questions?limit=10`));
    expectPage(await json(`/instances/${instanceId}/exams?limit=10`));
  });
});
