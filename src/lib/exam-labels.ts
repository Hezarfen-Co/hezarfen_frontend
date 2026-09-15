import type { KnownExamKind } from "@/api/client";
import type { MessageKey } from "@/i18n/messages";

type T = (key: MessageKey, vars?: Record<string, string | number>) => string;

const EXAM_KIND_LABELS: Record<KnownExamKind, MessageKey> = {
  homework: "exams.kind.homework",
  quiz: "exams.kind.quiz",
  midterm: "exams.kind.midterm",
  final: "exams.kind.final",
  project: "exams.kind.project",
  oral: "exams.kind.oral",
};

export function isKnownExamKind(kind: string): kind is KnownExamKind {
  return kind in EXAM_KIND_LABELS;
}

export function examKindLabel(kind: string, t: T): string {
  return kind in EXAM_KIND_LABELS ? t(EXAM_KIND_LABELS[kind as KnownExamKind]) : kind;
}

/** Attempts cell for the live monitor. `maxAttempts` comes from the monitored
 * exam itself (the roster rows don't carry it); `0` means unlimited. */
export function attemptLabel(
  entry: { attempt?: number | null; attempts_used?: number | null },
  maxAttempts: number | null | undefined,
): string {
  if (entry.attempts_used != null && maxAttempts != null && maxAttempts > 0) {
    return `${entry.attempts_used} / ${maxAttempts}`;
  }
  if (entry.attempt != null) return String(entry.attempt);
  if (entry.attempts_used != null) return String(entry.attempts_used);
  return "—";
}
