import { For, Show } from "solid-js";
import type { MealMenu } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { EmptyInline } from "@/components/ui/empty-inline";
import { MealMenuRow } from "@/components/meals/meal-menu-row";
import { formatMealDay } from "@/lib/meals";
import { useT } from "@/stores/preferences-context";

/** A day heading and its meals in one hairline list — no card per meal. */
export function MealDayGroup(props: {
  date: string;
  menus: MealMenu[];
  locale: string;
  isToday: boolean;
}) {
  const t = useT();
  return (
    <section aria-labelledby={`meal-day-${props.date}`} class="space-y-2">
      <h3 id={`meal-day-${props.date}`} class="flex items-center gap-2 text-sm font-semibold text-text-strong">
        <span class="first-letter:uppercase">{formatMealDay(props.date, props.locale)}</span>
        <Show when={props.isToday}><Badge variant="info">{t("meals.today")}</Badge></Show>
      </h3>
      <Show
        when={props.menus.length > 0}
        fallback={<EmptyInline illustration="meals" title={t("meals.emptyDay")} hint={t("meals.emptyDayHint")} class="rounded-xl border border-border-line bg-surface-tint/40 py-8" />}
      >
        <div class="divide-y divide-border-hairline overflow-hidden rounded-xl border border-border-line">
          <For each={props.menus}>
            {(menu) => <MealMenuRow menu={menu} locale={props.locale} />}
          </For>
        </div>
      </Show>
    </section>
  );
}
