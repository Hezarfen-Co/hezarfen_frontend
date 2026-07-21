import { Show, createResource } from "solid-js";
import { getSettings } from "@/api/settings";
import type { Exam } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { ExamLink } from "@/components/exams/exam-link";
import { cn } from "@/lib/cn";
import { examKindLabel } from "@/lib/exam-labels";
import { examDisplayStatus, examStatusTone } from "@/lib/exam-status";
import { examWeight } from "@/lib/exam-weight";
import { examDurationMs, formatDateTime, formatDurationMinutes } from "@/lib/format";
import { scheduleStatusClass, scheduleStatusDotClass } from "@/lib/schedule-status";
import { usePreferences, useT } from "@/stores/preferences-context";

export function ExamCard(props: { exam: Exam; courseTitle?: string; now?: number }) {
  const t = useT();
  const { locale } = usePreferences();
  const [settings] = createResource(() => getSettings());
  const modeLabel = () => {
    if (props.exam.mode === "sync") return t("exams.mode.sync");
    if (props.exam.mode === "async") return t("exams.mode.async");
    if (props.exam.mode === "open") return t("exams.mode.open");
    return t("exams.unscheduled");
  };

  const status = () => {
    return examDisplayStatus(props.exam, props.now ?? Date.now());
  };

  const statusLabel = () => {
    const s = status();
    if (s === "draft") return t("exams.draft");
    if (s === "unscheduled") return t("exams.unscheduled");
    if (s === "submitted") return t("attempt.submitted");
    if (s === "expired") return t("attempt.expired");
    if (s === "no_attempts_left") return t("attempt.noAttemptsLeft");
    if (s === "finished") return t("exams.finished");
    if (s === "upcoming") return t("exams.upcoming");
    return t("exams.active");
  };

  return (
    <ExamLink examId={props.exam.id} class="group block h-full">
      <article class="data-shell flex h-full min-h-48 flex-col overflow-hidden transition-colors group-hover:border-primary/35">
        <div class="flex flex-1 flex-col p-3">
          <div class="mb-3 flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1 space-y-1">
            <Show when={props.courseTitle}>
                <p class="truncate text-xs font-medium text-muted-foreground">{props.courseTitle}</p>
            </Show>
              <h3 class="line-clamp-2 font-display text-base font-semibold leading-snug group-hover:text-primary">
              {props.exam.title}
              </h3>
            </div>
            <Badge variant="outline" class={cn("shrink-0 rounded-sm capitalize", scheduleStatusClass(examStatusTone(status())))}>
              <span class={cn("mr-1.5 inline-block h-1.5 w-1.5 rounded-full", scheduleStatusDotClass(examStatusTone(status())))} />
              {statusLabel()}
            </Badge>
          </div>

          <p class="line-clamp-2 min-h-10 text-[13px] leading-relaxed text-muted-foreground">
            {props.exam.description || "—"}
          </p>

          <div class="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline" class="rounded-sm capitalize">
              {examKindLabel(String(props.exam.kind), t)}
              <Show when={examWeight(props.exam, settings()?.exam_kinds) != null}>
                {(weight) => <span class="ml-1 text-muted-foreground">({t("courses.weight")}: {weight()})</span>}
              </Show>
            </Badge>
            <Badge variant="outline" class="rounded-sm">
              {modeLabel()}
            </Badge>
          </div>
        </div>

        <div class="border-t border-border bg-muted/25 px-3 py-3">
          <dl class="grid gap-2 text-xs text-muted-foreground">
            <Show when={props.exam.starts_at != null && props.exam.ends_at != null}>
              <div class="grid gap-1 sm:grid-cols-2">
                <div>
                  <dt class="font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("events.starts")}</dt>
                  <dd class="mono mt-1 text-foreground">{formatDateTime(props.exam.starts_at, locale())}</dd>
                </div>
                <div>
                  <dt class="font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("events.ends")}</dt>
                  <dd class="mono mt-1 text-foreground">{formatDateTime(props.exam.ends_at, locale())}</dd>
                </div>
              </div>
            </Show>
            <div class="flex items-center justify-between gap-3">
              <dt>{t("exams.durationMinutes")}</dt>
              <dd class="mono font-medium text-foreground">
                {formatDurationMinutes(examDurationMs(props.exam.duration_ms, props.exam.starts_at, props.exam.ends_at), locale())}
              </dd>
            </div>
          </dl>
        </div>
      </article>
    </ExamLink>
  );
}
