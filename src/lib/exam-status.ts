import type { AttemptStatus, Exam, LiveMonitor, LiveRosterEntry } from "@/api/client";
import type { MessageKey } from "@/i18n/messages";

export type ExamAttemptSummary = {
  status: AttemptStatus | "not_started";
  attempts_used: number;
  max_attempts: number;
};

export type ExamDisplayStatus = "draft" | "unscheduled" | "upcoming" | "active" | "finished" | "submitted" | "expired" | "no_attempts_left";

export function isSittableExam(exam: Exam): boolean {
  return exam.mode === "sync" || exam.mode === "async" || exam.mode === "open";
}

export function examDisplayStatus(exam: Exam, now: number, attempt?: ExamAttemptSummary | null): ExamDisplayStatus {
  if (attempt?.status === "submitted" || attempt?.status === "expired") return attempt.status;

  const noAttemptsLeft = attempt && attempt.status !== "in_progress" && attempt.max_attempts > 0 && attempt.attempts_used >= attempt.max_attempts;

  if (noAttemptsLeft) {
    return "no_attempts_left";
  }

  if (exam.draft) return "draft";
  if (!isSittableExam(exam)) return "unscheduled";
  if (exam.mode === "open") return "active";
  if (exam.ends_at != null && exam.ends_at < now) return "finished";
  if (exam.starts_at != null && exam.starts_at > now) return "upcoming";
  return "active";
}

/**
 * A roster entry's status as the teacher's live monitor renders it. `left` is a
 * student who walked out of the room mid-attempt (still `in_progress` in the DB,
 * but with `left_at` stamped).
 */
export type LiveDisplayStatus = LiveRosterEntry["status"] | ExamDisplayStatus | "left";

/**
 * The live-monitor display status for one roster entry. A student actively
 * sitting the exam (`in_progress`, still in the room) is always `in_progress`,
 * even on their final allowed attempt — `attempts_used` counts the running
 * sitting, so a `max_attempts >= attempts_used` test would mislabel every
 * live single-attempt student as `no_attempts_left`. Attempt exhaustion only
 * shows once the sitting is no longer running (submitted, expired, or walked
 * out), which `examDisplayStatus` and the `left` branch below handle.
 */
export function liveDisplayStatus(entry: LiveRosterEntry, exam: LiveMonitor["exam"], now: number): LiveDisplayStatus {
  if (entry.status === "absent") return "absent";
  if (entry.status === "not_started") return "not_started";
  if (entry.status === "in_progress" && entry.left_at != null) {
    return exam.max_attempts > 0 && entry.attempts_used >= exam.max_attempts ? "no_attempts_left" : "left";
  }
  const status = examDisplayStatus(exam, now, { status: entry.status, attempts_used: entry.attempts_used, max_attempts: exam.max_attempts });
  return status === "active" ? "in_progress" : status;
}

export function examStatusTone(status: ExamDisplayStatus): string {
  if (status === "submitted") return "submitted";
  if (status === "expired" || status === "no_attempts_left") return "finished";
  return status;
}

export function examStatusMessageKey(status: ExamDisplayStatus): MessageKey {
  if (status === "submitted") return "attempt.submitted";
  if (status === "expired") return "attempt.expired";
  if (status === "no_attempts_left") return "attempt.noAttemptsLeft";
  if (status === "draft") return "exams.draft";
  if (status === "unscheduled") return "exams.unscheduled";
  if (status === "finished") return "exams.finished";
  if (status === "upcoming") return "exams.upcoming";
  return "exams.active";
}
