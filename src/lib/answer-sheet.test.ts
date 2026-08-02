import { expect, test } from "vitest";
import type { ExamQuestion, StudentAnswer } from "@/api/client";
import { joinAnswerSheet } from "./answer-sheet";

function question(id: string, overrides: Partial<ExamQuestion> = {}): ExamQuestion {
  return {
    id,
    exam: "e1",
    subject: "s1",
    text: `Question ${id}`,
    kind: "choice",
    points: 10,
    choices: [{ id: "cA", text: "a" }, { id: "cB", text: "b" }],
    correct: "cA",
    ...overrides,
  };
}

function answer(questionId: string, overrides: Partial<StudentAnswer> = {}): StudentAnswer {
  return {
    question: questionId,
    selected: "cA",
    text: null,
    updated_at: 1,
    is_correct: true,
    ...overrides,
  };
}

test("pairs each question with its answer by id, keeping question order", () => {
  const rows = joinAnswerSheet(
    [question("q1"), question("q2")],
    [answer("q2", { selected: "cB", is_correct: false }), answer("q1")],
  );
  expect(rows.map((r) => r.question.id)).toEqual(["q1", "q2"]);
  expect(rows[0].answer?.is_correct).toBe(true);
  expect(rows[1].answer?.selected).toBe("cB");
});

test("unanswered question yields a null answer", () => {
  const rows = joinAnswerSheet([question("q1")], []);
  expect(rows).toHaveLength(1);
  expect(rows[0].answer).toBeNull();
});

test("answers for deleted questions are dropped", () => {
  const rows = joinAnswerSheet([question("q1")], [answer("gone")]);
  expect(rows).toHaveLength(1);
  expect(rows[0].answer).toBeNull();
});

test("text answers carry the student's text through", () => {
  const rows = joinAnswerSheet(
    [question("q1", { kind: "text", choices: null, correct: null })],
    [answer("q1", { selected: null, text: "my essay", is_correct: null })],
  );
  expect(rows[0].answer?.text).toBe("my essay");
});
