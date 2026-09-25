import { For } from "solid-js";
import type { MealMenu } from "@/api/client";
import { cn } from "@/lib/cn";
import { addDaysIso, formatMealDay } from "@/lib/meals";
import { useT } from "@/stores/preferences-context";

/** All seven days stay visible, including days with no published menu. */
export function MealDayPicker(props: {
  weekStart: string;
  selectedDate: string;
  locale: string;
  days: { date: string; menus: MealMenu[] }[];
  onSelect: (date: string) => void;
}) {
  const t = useT();
  const dates = () => Array.from({ length: 7 }, (_, index) => addDaysIso(props.weekStart, index));
  const count = (date: string) => props.days.find((day) => day.date === date)?.menus.length ?? 0;
  const weekday = (date: string) => new Intl.DateTimeFormat(props.locale, { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));

  return (
    <nav aria-label={t("meals.weekDays")} class="-mx-4 overflow-x-auto px-4 pb-1">
      <div class="flex min-w-max gap-2 sm:min-w-0">
        <For each={dates()}>
          {(date) => (
            <button
              type="button"
              aria-pressed={date === props.selectedDate}
              aria-label={`${formatMealDay(date, props.locale)} · ${t("meals.menuCount", { count: count(date) })}`}
              onClick={() => props.onSelect(date)}
              class={cn(
                "flex min-h-20 min-w-16 flex-1 flex-col items-center justify-center rounded-lg border px-2 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                date === props.selectedDate
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border-line bg-card text-muted-foreground hover:border-border hover:bg-surface-tint",
              )}
            >
              <span class="text-xs font-medium uppercase">{weekday(date)}</span>
              <span class="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{Number(date.slice(-2))}</span>
              <span class={cn("mt-1 h-1.5 w-1.5 rounded-full", count(date) > 0 ? "bg-primary" : "bg-border-line")} aria-hidden="true" />
            </button>
          )}
        </For>
      </div>
    </nav>
  );
}
