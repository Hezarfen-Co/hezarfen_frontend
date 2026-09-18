import { For, Show } from "solid-js";
import { Link } from "@tanstack/solid-router";
import type { MealMenu } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { ComingSoonBadge, ComingSoonValue } from "@/components/ui/coming-soon";
import { IconAlert, IconUtensils } from "@/components/ui/icons";
import { formatTry } from "@/lib/meals";

export function MealMenuCard(props: {
  menu: MealMenu;
  locale: string;
  labels: { dishes: string; capacity: string; conflict: string; reservations?: string; topPick: string };
  /**
   * Confirmed booking count for this menu (`getMealMenuBookings(...).total`),
   * manager+ only per the backend's booking-audit scope. Undefined for
   * everyone else — the reservation line and occupancy bar simply don't
   * render rather than showing a made-up number.
   */
  reservationCount?: number;
}) {
  const total = () => props.menu.dishes.reduce((sum, dish) => sum + dish.price_minor, 0);
  const conflicts = () => [...new Set(props.menu.dishes.flatMap((dish) => dish.conflicts))];
  const occupancyPct = () => {
    const cap = props.menu.capacity;
    if (cap == null || cap <= 0 || props.reservationCount == null) return null;
    return Math.min(100, Math.round((props.reservationCount / cap) * 100));
  };

  return (
    <Link to="/meals/$id" params={{ id: props.menu.id }} class="group flex min-h-56 flex-col rounded-xl border border-border-line bg-surface-base p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 items-center gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-hairline bg-surface-tint"><IconUtensils class="h-5 w-5" /></span>
          <div class="min-w-0"><h2 class="truncate font-semibold text-text-strong">{props.menu.slot}</h2><time class="mono text-xs text-text-subtle" datetime={props.menu.date}>{props.menu.date}</time></div>
        </div>
        <span class="shrink-0 font-semibold tabular-nums">{formatTry(total(), props.locale)}</span>
      </div>
      <div class="mt-2 flex justify-end"><ComingSoonBadge /></div>
      <div class="mt-4 flex flex-wrap gap-1.5"><For each={props.menu.dishes}>{(dish) => <Badge variant="outline">{dish.name}</Badge>}</For></div>
      <Show when={conflicts().length > 0}>
        <div class="mt-3 flex items-start gap-2 rounded-xl border border-warning/50 bg-warning/10 p-2 text-xs text-warning-text">
          <IconAlert class="mt-0.5 h-4 w-4" /><span>{props.labels.conflict}: {conflicts().join(", ")}</span>
        </div>
      </Show>
      <Show when={occupancyPct() != null}>
        <div class="mt-3 space-y-1">
          <div class="flex justify-between text-xs text-text-subtle">
            <span>{props.labels.reservations}: {props.reservationCount}</span>
            <span class="mono">%{occupancyPct()}</span>
          </div>
          <div class="h-1.5 overflow-hidden rounded-full bg-surface-fill">
            <div class="h-full rounded-full bg-success" style={{ width: `${occupancyPct()}%` }} />
          </div>
        </div>
      </Show>
      <div class="mt-auto flex justify-between border-t border-border-hairline pt-3 text-xs text-text-subtle">
        <span>{props.menu.dishes.length} {props.labels.dishes}</span>
        <span>{props.labels.capacity}: <span class="mono">{props.menu.capacity ?? "∞"}</span></span>
      </div>
      <div class="mt-2 flex items-center justify-between text-xs text-text-subtle">
        <span>{props.labels.topPick}</span>
        <ComingSoonValue />
      </div>
    </Link>
  );
}
