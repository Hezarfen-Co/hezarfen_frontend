import type { Exam } from "@/api/client";
import { type ExamDisplayStatus, examDisplayStatus, examStatusMessageKey } from "./exam-status";

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
