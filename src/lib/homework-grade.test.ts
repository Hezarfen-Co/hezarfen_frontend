import { expect, test } from "vitest";
import type { HomeworkRosterEntry } from "@/api/client";
import { defaultGradeStatus } from "./homework-grade";

const submission = {} as NonNullable<HomeworkRosterEntry["submission"]>;
const result = (status: string) => ({ status }) as NonNullable<HomeworkRosterEntry["result"]>;

test("a saved result wins", () => {
  expect(defaultGradeStatus({ result: result("incomplete"), missing: true, submission: null })).toBe("incomplete");
});

test("a non-submitter past the deadline defaults to missing", () => {
  expect(defaultGradeStatus({ result: null, missing: true, submission: null })).toBe("missing");
});

test("a submitter defaults to done", () => {
  expect(defaultGradeStatus({ result: null, missing: false, submission })).toBe("done");
});

test("a non-submitter before the deadline has no default", () => {
  expect(defaultGradeStatus({ result: null, missing: false, submission: null })).toBe("");
});
