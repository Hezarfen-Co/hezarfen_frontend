import { api, configuredExamKind, contractBaseUrl, expectPage, isLive, json, loginAdmin, SKIP_MESSAGE } from "./helpers/live-client";

if (!isLive) console.warn(SKIP_MESSAGE);

describe.skipIf(!isLive)(`learning contract @ ${contractBaseUrl}`, () => {
  let courseId = "";
  let examId = "";

  beforeAll(async () => {
    await loginAdmin();
    const tag = `contract-learning-${Date.now()}`;
    const course = await json<{ id: string; title: string; kind: string }>("/courses", {
      method: "POST",
      body: { title: tag, kind: "course" },
    });
    courseId = course.id;
    expect(course).toMatchObject({ title: tag, kind: "course" });
  });

  afterAll(async () => {
    if (courseId) await api(`/courses/${courseId}`, { method: "DELETE" });
  });

  // `/courses` takes limit/offset only — kind/term/search filtering is the
  // caller's job, so this asserts the envelope, not a server-side filter.
  it("returns courses through the standard page envelope", async () => {
    const page = await json<{ items: Array<{ id: string }> }>(`/courses?limit=10`);
    expectPage(page);
    expect(page.items.some((course) => course.id === courseId)).toBe(true);
  });

  it("supports course subjects and exam-question lists", async () => {
    const subject = await json<{ id: string; course: string }>(`/courses/${courseId}/subjects`, {
      method: "POST",
      body: { name: "contract subject" },
    });
    expect(subject.course).toBe(courseId);

    const examKind = await configuredExamKind();
    const exam = await json<{ id: string; course: string; draft: boolean }>(`/courses/${courseId}/exams`, {
      method: "POST",
      body: { title: "contract exam", kind: examKind, draft: true },
    });
    examId = exam.id;
    expect(exam.course).toBe(courseId);

    const question = await json<{ id: string; exam: string }>(`/exams/${examId}/questions`, {
      method: "POST",
      body: { subject_id: subject.id, text: "Contract question", kind: "text", points: 1 },
    });
    expect(question.exam).toBe(examId);
    expectPage(await json(`/exams/${examId}/questions?limit=10`));
    expectPage(await json(`/courses/${courseId}/exams?limit=10`));
  });
});
