import { Show } from "solid-js";
import { Link } from "@tanstack/solid-router";
import type { MealMenu } from "@/api/client";
import { IconAlert, IconChevronRight } from "@/components/ui/icons";
import { dietaryTagLabel, formatTry, mealSlotLabel } from "@/lib/meals";
import { useT } from "@/stores/preferences-context";

/**
 * One meal of a day: slot, the dishes as one quiet line, capacity and price.
 * Booking totals live on the menu's detail page (one audit read per menu).
 */
export function MealMenuRow(props: { menu: MealMenu; locale: string }) {
  const t = useT();
  const total = () => props.menu.dishes.reduce((sum, dish) => sum + dish.price_minor, 0);
  const dishes = () => props.menu.dishes.map((dish) => dish.name).join(" · ");
  const conflicts = () => [...new Set(props.menu.dishes.flatMap((dish) => dish.conflicts))];
  const capacity = () => (props.menu.capacity == null ? t("meals.unlimited") : String(props.menu.capacity));

  return (
    <Link
      to="/meals/$id"
      params={{ id: props.menu.id }}
      class="group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-2 px-4 py-4 transition-colors hover:bg-surface-tint focus-visible:bg-surface-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[8rem_minmax(0,1fr)_auto_auto] sm:items-center"
    >
      <span class="col-start-1 row-start-1 font-semibold text-text-strong sm:col-start-auto sm:row-start-auto">{mealSlotLabel(props.menu.slot, t)}</span>
      <span class="col-span-2 col-start-1 row-start-2 min-w-0 text-sm text-foreground sm:col-span-1 sm:col-start-auto sm:row-start-auto">
        <span class="block leading-relaxed">{dishes() || t("meals.noDishes")}</span>
        <Show when={conflicts().length > 0}>
          <span class="mt-1 flex items-start gap-1 text-xs text-warning-text">
            <IconAlert class="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t("meals.conflict")}: {conflicts().map((tag) => dietaryTagLabel(tag, t)).join(", ")}
          </span>
        </Show>
      </span>
      <span class="col-start-1 row-start-3 text-xs text-muted-foreground tabular-nums sm:col-start-auto sm:row-start-auto sm:text-right">
        {t("meals.capacity")} {capacity()}
      </span>
      <span class="col-start-2 row-start-1 text-right font-semibold tabular-nums sm:col-start-auto sm:row-start-auto">{formatTry(total(), props.locale)}</span>
      <IconChevronRight class="col-start-2 row-start-3 ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:hidden" />
    </Link>
  );
}
