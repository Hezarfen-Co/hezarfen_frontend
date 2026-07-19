import { expect, test } from "bun:test";
import { examWeight } from "./exam-weight";

const kinds = [
  { name: "quiz", weight: 2 },
  { name: "final", weight: 5 },
];

test("a direct weight (marks report) wins over the settings lookup", () => {
  expect(examWeight({ kind: "quiz", weight: 7 }, kinds)).toBe(7);
});

test("without a direct weight, the exam kind resolves through settings", () => {
  expect(examWeight({ kind: "final" }, kinds)).toBe(5);
});

test("unknown kind and no weight yields null", () => {
  expect(examWeight({ kind: "custom" }, kinds)).toBeNull();
  expect(examWeight({}, undefined)).toBeNull();
});
