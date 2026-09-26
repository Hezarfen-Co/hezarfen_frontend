import { For, Show } from "solid-js";
import type { MealDish } from "@/api/client";
import { MealDishRow } from "@/components/meals/meal-dish-row";
import { Button } from "@/components/ui/button";
import { TOOLBAR_CONTROL } from "@/components/ui/data-toolbar";
import { EmptyInline } from "@/components/ui/empty-inline";
import { IconAlert, IconPlus } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { dietaryTagLabel, formatTry } from "@/lib/meals";
import { useT } from "@/stores/preferences-context";

/** The menu itself: every dish on one hairline list, the total at the foot. */
export function MealDishList(props: {
  dishes: MealDish[];
  moneyLocale: string;
  canManage: boolean;
  onAdd: () => void;
  onEdit: (dish: MealDish) => void;
  onDelete: (dish: MealDish) => void;
}) {
  const t = useT();
  const total = () => props.dishes.reduce((sum, dish) => sum + dish.price_minor, 0);
  const conflicts = () => [...new Set(props.dishes.flatMap((dish) => dish.conflicts))];
  return (
    <section class="data-shell overflow-hidden" aria-labelledby="meal-dishes-title">
      <div class="flex flex-wrap items-start justify-between gap-3 p-4">
        <div class="min-w-0">
          <h2 id="meal-dishes-title" class="text-lg font-semibold tracking-tight text-foreground">{t("meals.menu")}</h2>
          <p class="mt-1 text-sm text-muted-foreground">{t("meals.dishCount", { count: props.dishes.length })}</p>
        </div>
        <Show when={props.canManage}>
          <Button variant="outline" size="sm" class={cn(TOOLBAR_CONTROL, "px-3.5")} onClick={props.onAdd}>
            <IconPlus class="h-4 w-4" />
            {t("meals.addDish")}
          </Button>
        </Show>
      </div>
      <Show when={conflicts().length > 0}>
        <p class="mx-4 mb-3 flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning-text">
          <IconAlert class="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t("meals.conflict")}: {conflicts().map((tag) => dietaryTagLabel(tag, t)).join(", ")}</span>
        </p>
      </Show>
      <Show when={props.dishes.length > 0} fallback={<EmptyInline illustration="meals" title={t("meals.noDishes")} class="border-t border-border-hairline" />}>
        <ul class="divide-y divide-border-hairline border-t border-border-hairline">
          <For each={props.dishes}>
            {(dish) => (
              <MealDishRow
                dish={dish}
                moneyLocale={props.moneyLocale}
                canManage={props.canManage}
                onEdit={() => props.onEdit(dish)}
                onDelete={() => props.onDelete(dish)}
              />
            )}
          </For>
        </ul>
        <div class="flex items-center justify-between border-t border-border-hairline bg-surface-tint/50 px-4 py-3 text-sm">
          <span class="text-muted-foreground">{t("meals.total")}</span>
          <span class="font-semibold tabular-nums">{formatTry(total(), props.moneyLocale)}</span>
        </div>
      </Show>
    </section>
  );
}
