import { For, Show } from "solid-js";
import { Link } from "@tanstack/solid-router";
import type { MealMenu } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { IconAlert, IconUtensils } from "@/components/ui/icons";
import { formatTry } from "@/lib/meals";

export function MealMenuCard(props: { menu: MealMenu; locale: string; labels: { dishes: string; capacity: string; conflict: string } }) {
  const total = () => props.menu.dishes.reduce((sum, dish) => sum + dish.price_minor, 0);
  const conflicts = () => [...new Set(props.menu.dishes.flatMap((dish) => dish.conflicts))];

  return (
    <Link to="/meals/$id" params={{ id: props.menu.id }} class="group flex min-h-56 flex-col rounded-xl border border-border-line bg-surface-base p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 items-center gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-hairline bg-surface-tint"><IconUtensils class="h-5 w-5" /></span>
          <div><h2 class="font-semibold text-text-strong">{props.menu.slot}</h2><time class="mono text-xs text-text-subtle" datetime={props.menu.date}>{props.menu.date}</time></div>
        </div>
        <span class="font-semibold tabular-nums">{formatTry(total(), props.locale)}</span>
      </div>
      <div class="mt-4 flex flex-wrap gap-1.5"><For each={props.menu.dishes}>{(dish) => <Badge variant="outline">{dish.name}</Badge>}</For></div>
      <Show when={conflicts().length > 0}>
        <div class="mt-3 flex items-start gap-2 rounded-xl border border-warning/50 bg-warning/10 p-2 text-xs text-warning">
          <IconAlert class="mt-0.5 h-4 w-4" /><span>{props.labels.conflict}: {conflicts().join(", ")}</span>
        </div>
      </Show>
      <div class="mt-auto flex justify-between border-t border-border-hairline pt-3 text-xs text-text-subtle">
        <span>{props.menu.dishes.length} {props.labels.dishes}</span>
        <span>{props.labels.capacity}: <span class="mono">{props.menu.capacity ?? "∞"}</span></span>
      </div>
    </Link>
  );
}
