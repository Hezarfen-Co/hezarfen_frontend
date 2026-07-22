import { Show } from "solid-js";
import { Link } from "@tanstack/solid-router";
import type { Event, EventAudience } from "@/api/client";
import type { MessageKey } from "@/i18n/messages";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { createNow } from "@/lib/create-now";
import { formatDateTime } from "@/lib/format";
import { scheduleStatusClass, scheduleStatusDotClass, type ScheduleStatus } from "@/lib/schedule-status";
import { usePreferences, useT } from "@/stores/preferences-context";

function audienceLabel(audience: EventAudience, t: ReturnType<typeof useT>): string {
  if (audience.kind === "role") return `${t("events.audience.role")}: ${t(`role.${audience.role}` as MessageKey)}`;
  if (audience.kind === "course") return t("events.audience.course");
  if (audience.kind === "registration") return t("events.audience.registration");
  return t("events.audience.school");
}

function eventStatus(event: Event, now: number): ScheduleStatus {
  if (event.starts_at == null) return "unscheduled";
  if (event.ends_at != null && event.ends_at < now) return "finished";
  if (event.starts_at > now) return "upcoming";
  return "active";
}

export function EventCard(props: { event: Event }) {
  const t = useT();
  const { locale } = usePreferences();
  const now = createNow();
  const status = () => eventStatus(props.event, now());
  const statusLabel = () => {
    const s = status();
    if (s === "unscheduled") return t("exams.unscheduled");
    if (s === "finished") return t("events.past");
    if (s === "upcoming") return t("events.upcoming");
    return t("dashboard.activeNow");
  };

  return (
    <Link to="/events/$id" params={{ id: props.event.id }} class="group block h-full">
      <article class="data-shell flex h-full min-h-40 flex-col overflow-hidden card-lift group-hover:border-primary/35">
        <div class="flex flex-1 flex-col p-3">
          <div class="mb-2 flex items-start justify-between gap-2">
            <h3 class="line-clamp-2 min-w-0 flex-1 font-display text-base font-semibold leading-snug group-hover:text-primary">
              {props.event.title}
            </h3>
            <Badge variant="outline" class={cn("shrink-0 rounded-sm capitalize", scheduleStatusClass(status()))}>
              <span class={cn("mr-1.5 inline-block h-1.5 w-1.5 rounded-full", scheduleStatusDotClass(status()))} />
              {statusLabel()}
            </Badge>
          </div>
          <p class="line-clamp-3 flex-1 text-[13px] leading-relaxed text-muted-foreground">
            {props.event.description || "—"}
          </p>
          <p class="mt-3 text-xs font-medium text-muted-foreground">{audienceLabel(props.event.audience, t)}</p>
        </div>
        <div class="border-t border-border bg-muted/25 px-3 py-3">
          <dl class="grid gap-2 text-xs text-muted-foreground">
            <div>
              <dt class="font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("events.starts")}</dt>
              <dd class="mono mt-1 text-foreground">{formatDateTime(props.event.starts_at, locale())}</dd>
            </div>
            <Show when={props.event.ends_at != null}>
              <div>
                <dt class="font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("events.ends")}</dt>
                <dd class="mono mt-1 text-foreground">{formatDateTime(props.event.ends_at, locale())}</dd>
              </div>
            </Show>
          </dl>
        </div>
      </article>
    </Link>
  );
}
