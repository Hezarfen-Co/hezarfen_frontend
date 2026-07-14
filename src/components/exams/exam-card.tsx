import { Show } from "solid-js";
import { Link } from "@tanstack/solid-router";
import type { Exam } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { examKindLabel } from "@/lib/exam-labels";
import { examWeight } from "@/lib/exam-weight";
import { examDurationMs, formatDateTime, formatDurationMinutes } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";

export function ExamCard(props: { exam: Exam; courseTitle?: string; now?: number }) {
  const t = useT();
  const { locale } = usePreferences();
  const modeLabel = () => {
    if (props.exam.mode === "sync") return t("exams.mode.sync");
    if (props.exam.mode === "async") return t("exams.mode.async");
    return t("exams.unscheduled");
  };

  const status = () => {
    if (props.exam.mode !== "sync" && props.exam.mode !== "async") return "unscheduled";
    const current = props.now ?? Date.now();
    if (props.exam.ends_at != null && props.exam.ends_at < current) return "finished";
    if (props.exam.starts_at != null && props.exam.starts_at > current) return "upcoming";
    return "active";
  };

  const statusLabel = () => {
    const s = status();
    if (s === "unscheduled") return t("exams.unscheduled");
    if (s === "finished") return t("exams.finished");
    if (s === "upcoming") return t("exams.upcoming");
    return t("exams.active");
  };

  const statusClass = () => {
    const s = status();
    if (s === "unscheduled") return "bg-muted text-muted-foreground border-muted";
    if (s === "finished") return "bg-muted text-muted-foreground border-muted";
    if (s === "upcoming") return "bg-amber-500/15 text-amber-600 border-amber-500/30";
    return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
  };

  const statusDot = () => {
    const s = status();
    if (s === "unscheduled") return "bg-muted-foreground";
    if (s === "finished") return "bg-muted-foreground";
    if (s === "upcoming") return "bg-amber-600";
    return "bg-emerald-600";
  };

  return (
    <Link to="/exams/$id" params={() => ({ id: props.exam.id })} class="group block h-full">
      <article class="surface-card relative flex h-full min-h-52 flex-col overflow-hidden transition-all group-hover:-translate-y-0.5 group-hover:border-rose-500/30 group-hover:shadow-sm">
        <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500/70 via-amber-400/50 to-transparent" />
        <div class="flex flex-1 flex-col p-4">
          <div class="mb-3 flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1 space-y-1">
            <Show when={props.courseTitle}>
                <p class="truncate text-xs font-medium text-muted-foreground">{props.courseTitle}</p>
            </Show>
              <h3 class="line-clamp-2 font-display text-lg font-semibold leading-snug group-hover:text-primary">
              {props.exam.title}
              </h3>
            </div>
            <Badge variant="outline" class={cn("shrink-0 rounded-full capitalize", statusClass())}>
              <span class={cn("mr-1.5 inline-block h-1.5 w-1.5 rounded-full", statusDot())} />
              {statusLabel()}
            </Badge>
          </div>

          <p class="line-clamp-2 min-h-10 text-sm leading-relaxed text-muted-foreground">
            {props.exam.description || "—"}
          </p>

          <div class="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline" class="rounded-full capitalize">
              {examKindLabel(String(props.exam.kind), t)}
              <Show when={examWeight(props.exam) != null}>
                {(weight) => <span class="ml-1 text-muted-foreground">({t("courses.weight")}: {weight()})</span>}
              </Show>
            </Badge>
            <Badge variant="outline" class="rounded-full">
              {modeLabel()}
            </Badge>
          </div>
        </div>

        <div class="border-t border-border/60 bg-muted/20 px-4 py-3">
          <dl class="grid gap-2 text-xs text-muted-foreground">
            <Show when={props.exam.starts_at != null && props.exam.ends_at != null}>
              <div class="grid gap-1 sm:grid-cols-2">
                <div>
                  <dt class="font-medium text-foreground">{t("events.starts")}</dt>
                  <dd>{formatDateTime(props.exam.starts_at, locale())}</dd>
                </div>
                <div>
                  <dt class="font-medium text-foreground">{t("events.ends")}</dt>
                  <dd>{formatDateTime(props.exam.ends_at, locale())}</dd>
                </div>
              </div>
            </Show>
            <div class="flex items-center justify-between gap-3">
              <dt>{t("exams.durationMinutes")}</dt>
              <dd class="font-medium text-foreground">
                {formatDurationMinutes(examDurationMs(props.exam.duration_ms, props.exam.starts_at, props.exam.ends_at), locale())}
              </dd>
            </div>
          </dl>
        </div>
      </article>
    </Link>
  );
}
