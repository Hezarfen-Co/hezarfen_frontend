import { Link } from "@tanstack/solid-router";
import type { Event } from "@/api/types";
import { formatDateTime } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";

export function EventCard(props: { event: Event }) {
  const t = useT();
  const { locale } = usePreferences();
  return (
    <Link to="/events/$id" params={{ id: props.event.id }} class="group block h-full">
      <article class="data-shell flex h-full min-h-40 flex-col overflow-hidden transition-colors group-hover:border-primary/35">
        <div class="flex flex-1 flex-col p-3">
          <h3 class="line-clamp-2 font-display text-base font-semibold leading-snug group-hover:text-primary">
            {props.event.title}
          </h3>
          <p class="mt-2 line-clamp-3 flex-1 text-[13px] leading-relaxed text-muted-foreground">
            {props.event.description || "—"}
          </p>
        </div>
        <div class="border-t border-border bg-muted/25 px-3 py-3">
          <dl class="grid gap-2 text-xs text-muted-foreground">
            <div>
              <dt class="font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("events.starts")}</dt>
              <dd class="mono mt-1 text-foreground">{formatDateTime(props.event.starts_at, locale())}</dd>
            </div>
            <div>
              <dt class="font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("events.ends")}</dt>
              <dd class="mono mt-1 text-foreground">{formatDateTime(props.event.ends_at, locale())}</dd>
            </div>
          </dl>
        </div>
      </article>
    </Link>
  );
}
