import { Link } from "@tanstack/solid-router";
import type { Event } from "@/api/types";
import { formatDateTime } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";

export function EventCard(props: { event: Event }) {
  const t = useT();
  const { locale } = usePreferences();
  return (
    <Link to="/events/$id" params={{ id: props.event.id }} class="group block h-full">
      <article class="surface-card relative flex h-full min-h-48 flex-col overflow-hidden transition-all group-hover:-translate-y-0.5 group-hover:border-sky-500/30 group-hover:shadow-sm">
        <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500/70 via-cyan-400/50 to-transparent" />
        <div class="flex flex-1 flex-col p-4">
          <h3 class="line-clamp-2 font-display text-lg font-semibold leading-snug group-hover:text-primary">
            {props.event.title}
          </h3>
          <p class="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
            {props.event.description || "—"}
          </p>
        </div>
        <div class="border-t border-border/60 bg-muted/20 px-4 py-3">
          <dl class="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <div>
              <dt class="font-medium text-foreground">{t("events.starts")}</dt>
              <dd>{formatDateTime(props.event.starts_at, locale())}</dd>
            </div>
            <div>
              <dt class="font-medium text-foreground">{t("events.ends")}</dt>
              <dd>{formatDateTime(props.event.ends_at, locale())}</dd>
            </div>
          </dl>
        </div>
      </article>
    </Link>
  );
}
