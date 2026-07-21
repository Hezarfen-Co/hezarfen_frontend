import type { AttemptStatus, Exam } from "@/api/client";

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
  if (attempt && attempt.status !== "in_progress" && attempt.max_attempts > 0 && attempt.attempts_used >= attempt.max_attempts) return "no_attempts_left";
  if (exam.draft) return "draft";
  if (!isSittableExam(exam)) return "unscheduled";
  if (exam.mode === "open") return "active";
  if (exam.ends_at != null && exam.ends_at < now) return "finished";
  if (exam.starts_at != null && exam.starts_at > now) return "upcoming";
  return "active";
}

export function examStatusTone(status: ExamDisplayStatus): string {
  if (status === "submitted") return "submitted";
  if (status === "expired" || status === "no_attempts_left") return "finished";
  return status;
}
