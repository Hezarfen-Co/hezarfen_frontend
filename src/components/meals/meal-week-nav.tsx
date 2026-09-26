import { For } from "solid-js";
import type { MealSlot } from "@/api/client";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import { TOOLBAR_CARD, TOOLBAR_CONTROL } from "@/components/ui/data-toolbar";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { inputDateToIso } from "@/lib/datetime-input";
import { addDaysIso, formatMealWeek, mealSlotLabel, weekStartIso } from "@/lib/meals";
import { useT } from "@/stores/preferences-context";

/** Week stepper, a date jump and the slot filter — the list's whole toolbar,
 *  on its own card with every control at the shared toolbar height. */
export function MealWeekNav(props: {
  weekStart: string;
  thisWeek: string;
  locale: string;
  slot: string;
  slots: MealSlot[];
  onWeekChange: (weekStart: string, selectedDate?: string) => void;
  onSlotChange: (slot: string) => void;
}) {
  const t = useT();
  const step = "h-10 w-10 rounded-full sm:h-8 sm:w-8 touch:h-10 touch:w-10";
  return (
    <div class={cn("flex flex-wrap items-center gap-2", TOOLBAR_CARD)}>
      <div class="flex items-center gap-1">
        <Button variant="outline" size="icon" class={step} aria-label={t("meals.prevWeek")} onClick={() => props.onWeekChange(addDaysIso(props.weekStart, -7))}>
          <IconChevronLeft class="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" class={step} aria-label={t("meals.nextWeek")} onClick={() => props.onWeekChange(addDaysIso(props.weekStart, 7))}>
          <IconChevronRight class="h-4 w-4" />
        </Button>
      </div>
      <p class="min-w-0 text-sm font-medium text-text-strong tabular-nums" aria-live="polite">{formatMealWeek(props.weekStart, props.locale)}</p>
      <Button variant="ghost" size="sm" class={cn(TOOLBAR_CONTROL, "px-3.5")} disabled={props.weekStart === props.thisWeek} onClick={() => props.onWeekChange(props.thisWeek)}>
        {t("meals.thisWeek")}
      </Button>
      <div class="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
        <DatePicker
          id="menus-week"
          // 16px on touch screens: below that iOS zooms into the focused field.
          class={cn(TOOLBAR_CONTROL, "w-40 text-base sm:text-[13px] md:text-[13px] touch:text-base")}
          placeholder={t("meals.goToDate")}
          value=""
          onChange={(value) => { const iso = inputDateToIso(value); if (iso) props.onWeekChange(weekStartIso(iso), iso); }}
        />
        <Select id="menus-slot" aria-label={t("meals.slot")} wrapperClass="w-auto" class={TOOLBAR_CONTROL} value={props.slot} onChange={(e) => props.onSlotChange(e.currentTarget.value)}>
          <option value="all">{t("meals.slot")}: {t("common.all")}</option>
          <For each={props.slots}>{(item) => <option value={item.name}>{mealSlotLabel(item.name, t)}</option>}</For>
        </Select>
      </div>
    </div>
  );
}
