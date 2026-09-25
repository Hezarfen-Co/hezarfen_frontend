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
      class="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-surface-tint focus-visible:bg-surface-tint focus-visible:outline-none sm:grid-cols-[9rem_minmax(0,1fr)_7rem_6rem_1rem]"
    >
      <span class="col-start-1 row-start-1 truncate font-medium text-text-strong sm:col-start-auto sm:row-start-auto">{mealSlotLabel(props.menu.slot, t)}</span>
      <span class="col-span-2 col-start-1 row-start-2 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground sm:col-span-1 sm:col-start-auto sm:row-start-auto">
        <Show when={conflicts().length > 0}>
          <span class="shrink-0 text-warning-text" title={`${t("meals.conflict")}: ${conflicts().map((tag) => dietaryTagLabel(tag, t)).join(", ")}`}>
            <IconAlert class="h-4 w-4" />
          </span>
        </Show>
        <span class="truncate">{dishes() || t("meals.noDishes")}</span>
      </span>
      <span class="hidden text-right text-xs text-muted-foreground tabular-nums sm:block">
        {t("meals.capacity")} {capacity()}
      </span>
      <span class="col-start-2 row-start-1 text-right font-medium tabular-nums sm:col-start-auto sm:row-start-auto">{formatTry(total(), props.locale)}</span>
      <IconChevronRight class="hidden h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 sm:block" />
    </Link>
  );
}
