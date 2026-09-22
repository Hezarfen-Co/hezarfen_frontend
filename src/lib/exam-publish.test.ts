import { countExamQuestions, isPublishing } from "@/lib/exam-publish";

const { getExamQuestions } = vi.hoisted(() => ({
  getExamQuestions: vi.fn(async () => ({ items: [], total: 3, limit: 1, offset: 0 })),
}));

vi.mock("@/api/exams", () => ({ getExamQuestions }));

afterEach(() => {
  vi.clearAllMocks();
});

test("clearing the draft flag on a draft exam publishes it", () => {
  expect(isPublishing({ draft: true }, false)).toBe(true);
});

test("creating an exam without the draft flag publishes it", () => {
  expect(isPublishing(null, false)).toBe(true);
  expect(isPublishing(undefined, false)).toBe(true);
});

test("an exam that stays or becomes a draft is not published", () => {
  expect(isPublishing({ draft: true }, true)).toBe(false);
  expect(isPublishing({ draft: false }, true)).toBe(false);
  expect(isPublishing(null, true)).toBe(false);
});

test("editing an exam that is already live is not a publish", () => {
  expect(isPublishing({ draft: false }, false)).toBe(false);
});

test("countExamQuestions reads the total of a one-row page", async () => {
  await expect(countExamQuestions("exam-1")).resolves.toBe(3);
  expect(getExamQuestions).toHaveBeenCalledWith("exam-1", { limit: 1 });
});
