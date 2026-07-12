import { Show } from "solid-js";
import { Link } from "@tanstack/solid-router";
import type { Exam } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { examKindLabel } from "@/lib/exam-labels";
import { examDurationMs, formatDateTime, formatDurationMinutes } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";

export function ExamCard(props: { exam: Exam; courseTitle?: string }) {
  const t = useT();
  const { locale } = usePreferences();
  const modeLabel = () => {
    if (props.exam.mode === "sync") return t("exams.mode.sync");
    if (props.exam.mode === "async") return t("exams.mode.async");
    return t("exams.unscheduled");
  };

  const status = () => {
    const now = Date.now();
    if (props.exam.ends_at != null && props.exam.ends_at < now) return "finished";
    if (props.exam.starts_at != null && props.exam.starts_at > now) return "upcoming";
    return "active";
  };

  const statusLabel = () => {
    const s = status();
    if (s === "finished") return t("exams.finished");
    if (s === "upcoming") return t("exams.upcoming");
    return t("exams.active");
  };

  const statusClass = () => {
    const s = status();
    if (s === "finished") return "bg-muted text-muted-foreground border-muted";
    if (s === "upcoming") return "bg-amber-500/15 text-amber-600 border-amber-500/30";
    return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
  };

  const statusDot = () => {
    const s = status();
    if (s === "finished") return "bg-muted-foreground";
    if (s === "upcoming") return "bg-amber-600";
    return "bg-emerald-600";
  };

  return (
    <Link to="/exams/$id" params={{ id: props.exam.id }} class="group block h-full">
      <article class="surface-card relative flex h-full flex-col overflow-hidden transition-all group-hover:-translate-y-0.5 group-hover:border-rose-500/30">
        <div class="flex items-start justify-between gap-3 border-b border-border/50 bg-gradient-to-br from-rose-500/10 via-transparent to-transparent p-5">
          <div class="min-w-0 flex-1">
            <Show when={props.courseTitle}>
              <p class="mb-0.5 truncate text-xs text-muted-foreground">{props.courseTitle}</p>
            </Show>
            <h3 class="font-display text-lg font-semibold leading-snug group-hover:text-primary">
              {props.exam.title}
            </h3>
          </div>
          <div class="flex shrink-0 flex-col items-stretch gap-1.5">
            <Badge variant="outline" class={cn("rounded-sm capitalize w-full text-right", statusClass())}>
              <span class={cn("mr-1.5 inline-block h-1.5 w-1.5 rounded-full", statusDot())} />
              {statusLabel()}
            </Badge>
            <Badge variant="outline" class="rounded-sm capitalize w-full text-right">
              {examKindLabel(String(props.exam.kind), t)}
            </Badge>
          </div>
        </div>
        <div class="p-5">
          <p class="line-clamp-3 text-sm text-muted-foreground">
            {props.exam.description || "—"}
          </p>
          <dl class="mt-4 grid gap-2 text-xs text-muted-foreground">
            <div class="flex justify-between gap-3">
              <dt>{t("exams.mode")}</dt>
              <dd class="font-medium text-foreground">{modeLabel()}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt>{t("exams.window")}</dt>
              <dd class="text-right">{formatDateTime(props.exam.starts_at, locale())} → {formatDateTime(props.exam.ends_at, locale())}</dd>
            </div>
            {(props.exam.mode === "sync" || props.exam.mode === "async") && (
              <div class="flex justify-between gap-3">
                <dt>{t("exams.durationMinutes")}</dt>
                <dd>{formatDurationMinutes(examDurationMs(props.exam.duration_ms, props.exam.starts_at, props.exam.ends_at), locale())}</dd>
              </div>
            )}
          </dl>
        </div>
      </article>
    </Link>
  );
}
