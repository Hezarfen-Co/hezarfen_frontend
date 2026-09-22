import { expect, test } from "vitest";
import { attemptLabel } from "./exam-labels";

test("shows used/max when the exam caps attempts", () => {
  expect(attemptLabel({ attempts_used: 1, attempt: 1 }, 3)).toBe("1 / 3");
});

test("unlimited attempts (max 0) falls back to the attempt count", () => {
  expect(attemptLabel({ attempts_used: 2, attempt: 2 }, 0)).toBe("2");
});

test("no attempt data renders a dash", () => {
  expect(attemptLabel({}, 3)).toBe("—");
});

test("exam kind labels: built-in, seeded Turkish keys, and custom fallback", async () => {
  const { examKindLabel, isKnownExamKind } = await import("./exam-labels");
  const t = (key: string) => `<${key}>`;
  expect(examKindLabel("midterm", t)).toBe("<exams.kind.midterm>");
  expect(examKindLabel("yazili", t)).toBe("<exams.kind.yazili>");
  expect(examKindLabel("sozlu", t)).toBe("<exams.kind.oral>");
  expect(examKindLabel("uygulama", t)).toBe("<exams.kind.uygulama>");
  expect(examKindLabel("deneme", t)).toBe("deneme");
  expect(examKindLabel("toString", t)).toBe("toString");
  // Seeded keys stay renamable in settings.
  expect(isKnownExamKind("yazili")).toBe(false);
});
