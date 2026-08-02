import type { Exam, LiveRosterEntry } from "@/api/client";
import { type ExamDisplayStatus, examDisplayStatus, examStatusMessageKey, liveDisplayStatus } from "./exam-status";

const exam = {
  id: "exam-1",
  course: "course-1",
  title: "Retake exam",
  description: "",
  kind: "quiz",
  mode: "sync",
  starts_at: 1,
  ends_at: 10_000,
  duration_ms: 10_000,
  max_attempts: 2,
  allow_rejoin: false,
  draft: false,
  creator: "teacher-1",
} satisfies Exam;

it("shows submitted after a completed attempt even when retakes remain", () => {
  expect(examDisplayStatus(exam, 5_000, { status: "submitted", attempts_used: 1, max_attempts: 2 })).toBe("submitted");
});

const rosterEntry = (over: Partial<LiveRosterEntry>): LiveRosterEntry => ({
  user: { id: "student-1", username: "veli", name: null, surname: null },
  status: "in_progress",
  attempt: 1,
  attempts_used: 1,
  deadline: 10_000,
  remaining_ms: 5_000,
  left_at: null,
  mark: null,
  answered: 0,
  started_at: 1,
  finished_at: null,
  last_activity: null,
  ...over,
});

describe("liveDisplayStatus", () => {
  // Regression: attempts_used counts the running sitting, so a student mid-exam
  // on a single-attempt exam must still read as in_progress, never no_attempts_left.
  it("keeps an active student on their final attempt in_progress", () => {
    const single = { ...exam, max_attempts: 1 } satisfies Exam;
    const entry = rosterEntry({ status: "in_progress", attempts_used: 1, left_at: null });
    expect(liveDisplayStatus(entry, single, 5_000)).toBe("in_progress");
  });

  it("keeps an active student on a multi-attempt exam in_progress", () => {
    const entry = rosterEntry({ status: "in_progress", attempts_used: 2, left_at: null });
    expect(liveDisplayStatus(entry, { ...exam, max_attempts: 2 }, 5_000)).toBe("in_progress");
  });

  it("shows left when a student walks out with retakes remaining", () => {
    const entry = rosterEntry({ status: "in_progress", attempts_used: 1, left_at: 4_000 });
    expect(liveDisplayStatus(entry, { ...exam, max_attempts: 2 }, 5_000)).toBe("left");
  });

  it("shows no_attempts_left when a student walks out of their final attempt", () => {
    const entry = rosterEntry({ status: "in_progress", attempts_used: 1, left_at: 4_000 });
    expect(liveDisplayStatus(entry, { ...exam, max_attempts: 1 }, 5_000)).toBe("no_attempts_left");
  });

  it("passes submitted, expired, absent, and not_started straight through", () => {
    expect(liveDisplayStatus(rosterEntry({ status: "submitted" }), exam, 5_000)).toBe("submitted");
    expect(liveDisplayStatus(rosterEntry({ status: "expired" }), exam, 5_000)).toBe("expired");
    expect(liveDisplayStatus(rosterEntry({ status: "absent" }), exam, 5_000)).toBe("absent");
    expect(liveDisplayStatus(rosterEntry({ status: "not_started" }), exam, 5_000)).toBe("not_started");
  });
});

it("maps every exam display status to the intended message key", () => {
  const expected: Record<ExamDisplayStatus, string> = {
    draft: "exams.draft",
    unscheduled: "exams.unscheduled",
    upcoming: "exams.upcoming",
    active: "exams.active",
    finished: "exams.finished",
    submitted: "attempt.submitted",
    expired: "attempt.expired",
    no_attempts_left: "attempt.noAttemptsLeft",
  };

  for (const status of Object.keys(expected) as ExamDisplayStatus[]) {
    expect(examStatusMessageKey(status)).toBe(expected[status]);
  }
});
