import type { HomeworkReportEntry } from "@/api/client";
import { summarizeChildHomework } from "./child-homework";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 8, 18, 9);
const entry = (id: string, due: number, state: Partial<HomeworkReportEntry> = {}): HomeworkReportEntry => ({
  class_course: "instance-1",
  homework: id,
  title: id,
  subject: "subject-1",
  due_at: due,
  submitted: false,
  late: false,
  missing: false,
  result: null,
  ...state,
});

it("splits a report into missing work and work due this week", () => {
  const summary = summarizeChildHomework(
    [
      entry("in-two-days", now + 2 * DAY),
      entry("missing-new", now - DAY, { missing: true }),
      entry("tomorrow", now + DAY),
      entry("missing-old", now - 5 * DAY, { missing: true }),
      entry("handed-in", now + DAY, { submitted: true }),
      entry("next-month", now + 30 * DAY),
    ],
    now,
  );
  expect(summary.missing.map((row) => row.homework)).toEqual(["missing-old", "missing-new"]);
  expect(summary.dueSoon.map((row) => row.homework)).toEqual(["tomorrow", "in-two-days"]);
});
