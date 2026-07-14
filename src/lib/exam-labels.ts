import type { KnownExamKind } from "@/api/types";
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

export function examKindLabel(kind: string, t: T): string {
  return kind in EXAM_KIND_LABELS ? t(EXAM_KIND_LABELS[kind as KnownExamKind]) : kind;
}
