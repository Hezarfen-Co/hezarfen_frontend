import { api, configuredExamKind, contractBaseUrl, isLive, json, loginAdmin, pngFile, SKIP_MESSAGE } from "./helpers/live-client";
import type { BankQuestion, Course, ExamQuestion, Subject } from "@/api/client";

if (!isLive) console.warn(SKIP_MESSAGE);

describe.skipIf(!isLive)(`bank-questions contract @ ${contractBaseUrl}`, () => {
  let yearId = "";
  let termId = "";
  let classId = "";
  let courseId = "";
  let instanceId = "";
  let subjectId = "";
  let questionId = "";

  // Bank templates hang off a catalog subject, but the exam that copies one
  // has to live in an instance — so the fixture builds the whole şube chain.
  beforeAll(async () => {
    await loginAdmin();
    const tag = `contract-${Date.now()}`;

    const year = await json<{ id: string }>("/academic-years", {
      method: "POST",
      body: { name: tag, starts_at: Date.now(), ends_at: Date.now() + 300 * 24 * 60 * 60 * 1000 },
    });
    yearId = year.id;
    const term = await json<{ id: string }>("/terms", {
      method: "POST",
      body: { name: tag, year: yearId, starts_at: Date.now(), ends_at: Date.now() + 120 * 24 * 60 * 60 * 1000 },
    });
    termId = term.id;
    const klass = await json<{ id: string }>("/classes", {
      method: "POST",
      body: { name: tag, grade: "9", year: yearId },
    });
    classId = klass.id;

    const course = await json<Course>("/courses", {
      method: "POST",
      body: { title: tag },
    });
    courseId = course.id;
    const subject = await json<Subject>(`/courses/${courseId}/subjects`, {
      method: "POST",
      body: { name: "contract subject" },
    });
    subjectId = subject.id;

    const instance = await json<{ id: string }>(`/classes/${classId}/instances`, {
      method: "POST",
      body: { course_id: courseId },
    });
    instanceId = instance.id;
  });

  /** Templates created by the paging/search tests, torn down with the course. */
  const scratchIds: string[] = [];

  afterAll(async () => {
    for (const id of scratchIds) await api(`/bank-questions/${id}`, { method: "DELETE" });
    if (questionId) await api(`/bank-questions/${questionId}`, { method: "DELETE" });
    if (instanceId) await api(`/classes/${classId}/instances/${instanceId}`, { method: "DELETE" });
    if (courseId) await api(`/courses/${courseId}`, { method: "DELETE" });
    if (classId) await api(`/classes/${classId}`, { method: "DELETE" });
    if (termId) await api(`/terms/${termId}`, { method: "DELETE" });
    if (yearId) await api(`/academic-years/${yearId}`, { method: "DELETE" });
  });

  const createTemplate = async (text: string) => {
    const created = await json<BankQuestion>("/bank-questions", {
      method: "POST",
      body: { subject_id: subjectId, text, kind: "text", points: 1 },
    });
    scratchIds.push(created.id);
    return created;
  };

  it("GET /bank-questions answers the {items,total,limit,offset} envelope", async () => {
    const page = await json<Record<string, unknown>>("/bank-questions?limit=5");
    expect(Array.isArray(page.items)).toBe(true);
    expect(typeof page.total).toBe("number");
    expect(typeof page.limit).toBe("number");
    expect(typeof page.offset).toBe("number");
  });

  it("a trailing slash on the nest-root route 404s", async () => {
    const res = await api("/bank-questions/");
    expect(res.status).toBe(404);
  });

  it("creates a choice template, minting an id per choice and resolving correct by key", async () => {
    const created = await json<BankQuestion>("/bank-questions", {
      method: "POST",
      body: {
        subject_id: subjectId,
        text: "contract: which one?",
        kind: "choice",
        points: 1,
        // Client-local keys: the server replaces them, but `correct` may name one.
        choices: [{ id: "new:1", text: "A" }, { id: "new:2", text: "B" }],
        correct: "new:2",
      },
    });
    questionId = created.id;
    expect(created).toMatchObject({ subject: subjectId, kind: "choice", points: 1 });
    expect(created.choices?.map((choice) => choice.text)).toEqual(["A", "B"]);
    for (const choice of created.choices ?? []) expect(typeof choice.id).toBe("string");
    // Server-minted, so not the key we sent — and it still names the row we marked.
    expect(created.correct).toBe(created.choices?.[1].id);
    expect(created.correct).not.toBe("new:2");
    expect(typeof created.owner).toBe("string");
    expect(typeof created.created_at).toBe("number");
  });

  it("rejects a duplicate choice key and a correct that names nothing submitted", async () => {
    const dupe = await api("/bank-questions", {
      method: "POST",
      body: {
        subject_id: subjectId,
        text: "contract: dupe",
        kind: "choice",
        points: 1,
        choices: [{ id: "k", text: "A" }, { id: "k", text: "B" }],
        correct: "k",
      },
    });
    expect(dupe.status).toBe(400);

    const stray = await api("/bank-questions", {
      method: "POST",
      body: {
        subject_id: subjectId,
        text: "contract: stray correct",
        kind: "choice",
        points: 1,
        choices: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
        correct: "zzz",
      },
    });
    expect(stray.status).toBe(400);
  });

  it("stores per-option images keyed by choice id and reports them in choice_images", async () => {
    const question = await json<BankQuestion>(`/bank-questions/${questionId}`);
    for (const choice of question.choices ?? []) {
      const body = new FormData();
      body.append("file", pngFile(`choice-${choice.id}.png`));
      const res = await api(`/bank-questions/${questionId}/choices/${choice.id}/image`, {
        method: "POST",
        body,
      });
      expect(res.status).toBe(201);
    }
    const fetched = await json<BankQuestion>(`/bank-questions/${questionId}`);
    expect(fetched.choice_images?.[0]).toBeTruthy();
    expect(fetched.choice_images?.[1]).toBeTruthy();
  });

  it("PATCH without a choices key keeps the per-option images", async () => {
    const patched = await json<BankQuestion>(`/bank-questions/${questionId}`, {
      method: "PATCH",
      body: { text: "contract: still which one?" },
    });
    expect(patched.choice_images?.[0]).toBeTruthy();
    expect(patched.choice_images?.[1]).toBeTruthy();
  });

  // The whole point of the remodel: resubmitting the choices WITH their ids is no
  // longer a wipe, so the client needs no download-then-reupload compensation.
  it("PATCH resubmitting the stored ids keeps every image and the answer key", async () => {
    const before = await json<BankQuestion>(`/bank-questions/${questionId}`);
    const ids = (before.choices ?? []).map((choice) => choice.id);
    const patched = await json<BankQuestion>(`/bank-questions/${questionId}`, {
      method: "PATCH",
      body: {
        choices: [{ id: ids[0], text: "A" }, { id: ids[1], text: "B renamed" }],
        correct: ids[1],
      },
    });
    expect(patched.choices?.map((choice) => choice.id)).toEqual(ids);
    expect(patched.correct).toBe(ids[1]);
    expect(patched.choice_images?.[0]).toBeTruthy();
    expect(patched.choice_images?.[1]).toBeTruthy();
    const blob = await api(`/bank-questions/${questionId}/choices/${ids[0]}/image`);
    expect(blob.status).toBe(200);
  });

  // Dropping option A: only A's picture goes, B keeps its own and stays markable.
  it("PATCH replacing one option drops that option's image only", async () => {
    const before = await json<BankQuestion>(`/bank-questions/${questionId}`);
    const kept = before.choices![1];
    const patched = await json<BankQuestion>(`/bank-questions/${questionId}`, {
      method: "PATCH",
      body: {
        choices: [{ id: "new:9", text: "A replaced" }, { id: kept.id, text: kept.text }],
        correct: kept.id,
      },
    });
    expect(patched.choices?.[1].id).toBe(kept.id);
    expect(patched.choices?.[0].id).not.toBe(before.choices![0].id);
    expect(patched.choice_images?.[0]).toBeNull();
    expect(patched.choice_images?.[1]).toBeTruthy();
    expect(patched.correct).toBe(kept.id);

    // 400, not 404: the id no longer names a choice of this question, so the
    // route rejects it before it ever looks for a blob.
    const gone = await api(`/bank-questions/${questionId}/choices/${before.choices![0].id}/image`);
    expect(gone.ok).toBe(false);
    expect(gone.status).toBe(400);
  });

  // The app is EN/TR: `İ` lowercases to `i` + U+0307 in both Rust and
  // SurrealQL, so an unfolded server search made `istanbul` and `İSTANBUL` two
  // disjoint queries and a Turkish teacher typing lowercase got an empty bank.
  it("?q= folds Turkish casing and diacritics in both directions", async () => {
    const tag = `tr${Date.now()}`;
    await createTemplate(`${tag} İSTANBUL kaç ilçedir?`);
    await createTemplate(`${tag} istanbul boğazı nerededir?`);

    for (const needle of ["istanbul", "İSTANBUL", "ıstanbul", "ISTANBUL"]) {
      const page = await json<{ total: number; items: BankQuestion[] }>(
        `/bank-questions?q=${encodeURIComponent(`${tag} ${needle}`)}`,
      );
      expect(page.total, `needle ${needle}`).toBe(2);
      expect(page.items).toHaveLength(2);
    }
    for (const needle of ["ilce", "ilçe", "bogaz", "boğaz"]) {
      const page = await json<{ total: number }>(
        `/bank-questions?q=${encodeURIComponent(needle)}&subject=${subjectId}`,
      );
      expect(page.total, `needle ${needle}`).toBe(1);
    }
    const miss = await json<{ total: number }>(`/bank-questions?q=${tag}-ankara`);
    expect(miss.total).toBe(0);
  });

  // Regression for the whole-table-then-slice list: template #101 onward was
  // unreachable, and `total` counted the page instead of the matches.
  it("pages past 100 with an honest total and joined-on names", async () => {
    const tag = `pg${Date.now()}`;
    for (let i = 0; i < 105; i++) await createTemplate(`${tag} ${String(i).padStart(3, "0")}`);

    type Page = { total: number; items: BankQuestion[]; limit: number; offset: number };
    const first = await json<Page>(`/bank-questions?subject=${subjectId}&q=${tag}&limit=100`);
    expect(first.total).toBe(105);
    expect(first.items).toHaveLength(100);
    // Newest first, and the names are joined on server-side.
    expect(first.items[0].text).toBe(`${tag} 104`);
    expect(first.items[0].subject_name).toBe("contract subject");
    expect(typeof first.items[0].owner_name).toBe("string");

    const second = await json<Page>(
      `/bank-questions?subject=${subjectId}&q=${tag}&limit=100&offset=100`,
    );
    expect(second.total).toBe(105);
    expect(second.items).toHaveLength(5);
    expect(second.items[4].text).toBe(`${tag} 000`);
  });
  // Provenance made useful: the list says how many exam questions were copied
  // out of a template, and a copy that drifted can be pulled back in line.
  it("reports used_count on the list and refreshes a copy from its template", async () => {
    const tag = `use${Date.now()}`;
    const template = await createTemplate(`${tag} original text`);
    const exam = await json<{ id: string }>(`/instances/${instanceId}/exams`, {
      method: "POST",
      body: { title: tag, kind: await configuredExamKind(), term: termId },
    });

    const copy = await json<ExamQuestion>(
      `/exams/${exam.id}/questions/from-bank/${template.id}`,
      { method: "POST", body: { subject_id: subjectId } },
    );
    expect(copy.from_bank).toBe(template.id);

    // One grouped join on the list; the single-template GET stays at 0.
    const page = await json<{ items: BankQuestion[] }>(`/bank-questions?q=${tag}`);
    expect(page.items.find((item) => item.id === template.id)?.used_count).toBe(1);
    const single = await json<BankQuestion>(`/bank-questions/${template.id}`);
    expect(single.used_count).toBe(0);

    // The copy drifts locally, the template is fixed, and the refresh wins.
    await json<ExamQuestion>(`/exams/${exam.id}/questions/${copy.id}`, {
      method: "PATCH",
      body: { text: `${tag} local drift`, points: 9 },
    });
    await json<BankQuestion>(`/bank-questions/${template.id}`, {
      method: "PATCH",
      body: { text: `${tag} corrected text`, points: 3 },
    });
    const refreshed = await json<ExamQuestion>(
      `/exams/${exam.id}/questions/${copy.id}/refresh-from-bank`,
      { method: "POST" },
    );
    expect(refreshed.id).toBe(copy.id);
    expect(refreshed.text).toBe(`${tag} corrected text`);
    expect(refreshed.points).toBe(3);
    expect(refreshed.from_bank).toBe(template.id);

    // A hand-authored question has no template to refresh from: 400, not 404.
    const plain = await json<ExamQuestion>(`/exams/${exam.id}/questions`, {
      method: "POST",
      body: { subject_id: subjectId, text: `${tag} mine`, kind: "text", points: 1 },
    });
    const refused = await api(`/exams/${exam.id}/questions/${plain.id}/refresh-from-bank`, {
      method: "POST",
    });
    expect(refused.status).toBe(400);

    await api(`/exams/${exam.id}`, { method: "DELETE" });
  });
});
