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

// Kinds a school's settings commonly seed (Turkish ASCII keys). They are
// ordinary school-defined kinds — renamable in settings — but a key like
// "yazili" should still read as "Yazılı" wherever it is shown.
const SEEDED_EXAM_KIND_LABELS: Record<string, MessageKey> = {
  yazili: "exams.kind.yazili",
  sozlu: "exams.kind.oral",
  uygulama: "exams.kind.uygulama",
  performans: "exams.kind.performans",
  proje: "exams.kind.project",
};

export function isKnownExamKind(kind: string): kind is KnownExamKind {
  return Object.hasOwn(EXAM_KIND_LABELS, kind);
}

/** Display label for an exam kind key; unknown (custom) kinds show as typed. */
export function examKindLabel(kind: string, t: T): string {
  if (isKnownExamKind(kind)) return t(EXAM_KIND_LABELS[kind]);
  const seeded = Object.hasOwn(SEEDED_EXAM_KIND_LABELS, kind) ? SEEDED_EXAM_KIND_LABELS[kind] : undefined;
  return seeded ? t(seeded) : kind;
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
