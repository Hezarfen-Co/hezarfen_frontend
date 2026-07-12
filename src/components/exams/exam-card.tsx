import { Link } from "@tanstack/solid-router";
import type { Exam } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { examDurationMs, formatDateTime, formatDurationMinutes } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";

export function ExamCard(props: { exam: Exam }) {
  const t = useT();
  const { locale } = usePreferences();
  const modeLabel = () => {
    if (props.exam.mode === "sync") return t("exams.mode.sync");
    if (props.exam.mode === "async") return t("exams.mode.async");
    return t("exams.unscheduled");
  };

  return (
    <Link to="/exams/$id" params={{ id: props.exam.id }} class="group block h-full">
      <article class="surface-card relative flex h-full flex-col overflow-hidden transition-all group-hover:-translate-y-0.5 group-hover:border-rose-500/30">
        <div class="flex items-start justify-between gap-3 border-b border-border/50 bg-gradient-to-br from-rose-500/10 via-transparent to-transparent p-5">
          <h3 class="font-display text-lg font-semibold leading-snug group-hover:text-primary">
            {props.exam.title}
          </h3>
          <Badge variant="outline" class="rounded-sm capitalize">
            {props.exam.kind}
          </Badge>
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
                <dd>{formatDurationMinutes(examDurationMs(props.exam.duration_ms, props.exam.starts_at, props.exam.ends_at))}</dd>
              </div>
            )}
          </dl>
        </div>
      </article>
    </Link>
  );
}
