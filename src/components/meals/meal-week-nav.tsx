import { For } from "solid-js";
import type { MealSlot } from "@/api/client";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import { Select } from "@/components/ui/select";
import { inputDateToIso } from "@/lib/datetime-input";
import { addDaysIso, formatMealWeek, mealSlotLabel, weekStartIso } from "@/lib/meals";
import { useT } from "@/stores/preferences-context";

/** Week stepper, a date jump and the slot filter — the list's whole toolbar. */
export function MealWeekNav(props: {
  weekStart: string;
  thisWeek: string;
  locale: string;
  slot: string;
  slots: MealSlot[];
  onWeekChange: (weekStart: string) => void;
  onSlotChange: (slot: string) => void;
}) {
  const t = useT();
  return (
    <div class="flex flex-wrap items-center gap-2">
      <div class="flex items-center gap-1">
        <Button variant="outline" size="icon" class="h-8 w-8 rounded-lg" aria-label={t("meals.prevWeek")} onClick={() => props.onWeekChange(addDaysIso(props.weekStart, -7))}>
          <IconChevronLeft class="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" class="h-8 w-8 rounded-lg" aria-label={t("meals.nextWeek")} onClick={() => props.onWeekChange(addDaysIso(props.weekStart, 7))}>
          <IconChevronRight class="h-4 w-4" />
        </Button>
      </div>
      <p class="min-w-0 text-sm font-medium text-text-strong tabular-nums" aria-live="polite">{formatMealWeek(props.weekStart, props.locale)}</p>
      <Button variant="ghost" size="sm" class="h-8 rounded-lg text-[13px]" disabled={props.weekStart === props.thisWeek} onClick={() => props.onWeekChange(props.thisWeek)}>
        {t("meals.thisWeek")}
      </Button>
      <div class="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
        <DatePicker
          id="menus-week"
          class="h-8 w-40"
          placeholder={t("meals.goToDate")}
          value=""
          onChange={(value) => { const iso = inputDateToIso(value); if (iso) props.onWeekChange(weekStartIso(iso)); }}
        />
        <Select id="menus-slot" aria-label={t("meals.slot")} wrapperClass="w-auto" class="h-8 rounded-lg text-[13px]" value={props.slot} onChange={(e) => props.onSlotChange(e.currentTarget.value)}>
          <option value="all">{t("meals.slot")}: {t("common.all")}</option>
          <For each={props.slots}>{(item) => <option value={item.name}>{mealSlotLabel(item.name, t)}</option>}</For>
        </Select>
      </div>
    </div>
  );
}
