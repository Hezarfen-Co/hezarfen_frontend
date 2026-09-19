import type { Homework, HomeworkRosterEntry } from "@/api/client";
import { queueCandidates, queueRow } from "./homework-queue";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 8, 19, 9);
const hw = (id: string, due: number, createdBy = "t-1"): Homework => ({
  id,
  class_course: "i-1",
  subject: "s-1",
  title: id,
  description: null,
  due_at: due,
  assigned: null,
  created_by: createdBy,
  created_at: now - 30 * DAY,
});
const row = (state: Partial<HomeworkRosterEntry>): HomeworkRosterEntry => ({
  user: "u",
  submission: null,
  result: null,
  missing: false,
  unenrolled: false,
  ...state,
});

it("keeps the teacher's own homework due around now, closest first", () => {
  const picked = queueCandidates(
    [hw("old", now - 20 * DAY), hw("yesterday", now - DAY), hw("other-teacher", now - DAY, "t-2"), hw("tomorrow", now + DAY), hw("next-week", now + 7 * DAY), hw("last-week", now - 7 * DAY)],
    "t-1",
    now,
  );
  expect(picked.map((item) => item.id)).toEqual(["yesterday", "tomorrow", "last-week"]);
});

it("counts missing and ungraded work, leaving unenrolled rows out", () => {
  const submission = { text: "done", submitted_at: now, updated_at: now, late: false, files: [] };
  const counts = queueRow(hw("h", now), [
    row({ missing: true }),
    row({ missing: true, unenrolled: true }),
    row({ submission }),
    row({ submission, result: { mark: 80 } as never }),
    row({}),
  ]);
  expect(counts).toMatchObject({ missing: 1, toGrade: 1 });
});
