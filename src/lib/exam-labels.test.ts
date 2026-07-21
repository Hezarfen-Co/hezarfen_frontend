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
