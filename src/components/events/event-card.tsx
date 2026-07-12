import { Link } from "@tanstack/solid-router";
import type { Event } from "@/api/types";
import { formatDateTime } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";

export function EventCard(props: { event: Event }) {
  const t = useT();
  const { locale } = usePreferences();
  return (
    <Link to="/events/$id" params={{ id: props.event.id }} class="group block h-full">
      <article class="surface-card relative flex h-full flex-col overflow-hidden transition-all group-hover:-translate-y-0.5 group-hover:border-sky-500/30">
        <div class="h-1.5 w-full bg-gradient-to-r from-sky-500 via-cyan-400 to-teal-400" />
        <div class="flex flex-1 flex-col p-5">
          <h3 class="font-display text-lg font-semibold leading-snug group-hover:text-primary">
            {props.event.title}
          </h3>
          <p class="mt-2 line-clamp-2 flex-1 text-sm text-muted-foreground">
            {props.event.description || "—"}
          </p>
          <div class="mt-4 space-y-1 rounded-sm bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <p>
              <span class="font-medium text-foreground">{t("events.starts")}:</span>{" "}
              {formatDateTime(props.event.starts_at, locale())}
            </p>
            <p>
              <span class="font-medium text-foreground">{t("events.ends")}:</span>{" "}
              {formatDateTime(props.event.ends_at, locale())}
            </p>
          </div>
        </div>
      </article>
    </Link>
  );
}
