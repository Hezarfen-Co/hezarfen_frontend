import { For, Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { Button } from "@/components/ui/button";
import { IconCalendar, IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDate(date: Date): string {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function parseDate(value: string): Date | null {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, dayRaw, monthRaw, yearRaw] = match;
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function sameDay(a: Date | null, b: Date): boolean {
  return !!a && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function monthDays(month: Date): Array<Date | null> {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const first = new Date(year, monthIndex, 1);
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const blanks = (first.getDay() + 6) % 7;
  const cells: Array<Date | null> = Array.from({ length: blanks }, () => null);
  for (let day = 1; day <= days; day += 1) cells.push(new Date(year, monthIndex, day));
  return cells;
}

export function DatePicker(props: {
  id: string;
  value: string;
  placeholder: string;
  required?: boolean;
  class?: string;
  onChange: (value: string) => void;
}) {
  let root: HTMLDivElement | undefined;
  const [open, setOpen] = createSignal(false);
  const selected = createMemo(() => parseDate(props.value));
  const [month, setMonth] = createSignal(selected() ?? new Date());
  const days = createMemo(() => monthDays(month()));
  const monthLabel = createMemo(() =>
    new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(month()),
  );

  createEffect(() => {
    const date = selected();
    if (date) setMonth(date);
  });

  createEffect(() => {
    if (!open()) return;
    const closeOnOutside = (event: MouseEvent) => {
      if (root && !root.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutside);
    onCleanup(() => document.removeEventListener("mousedown", closeOnOutside));
  });

  const moveMonth = (delta: number) => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const pick = (date: Date) => {
    props.onChange(formatDate(date));
    setOpen(false);
  };

  return (
    <div ref={root} class="relative">
      <div class="relative">
        <Input
          id={props.id}
          class={cn("rounded-sm pr-9 placeholder:text-muted-foreground/45", props.class)}
          inputMode="numeric"
          placeholder={props.placeholder}
          pattern="\d{2}/\d{2}/\d{4}"
          value={props.value}
          required={props.required}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onInput={(e) => props.onChange(e.currentTarget.value)}
        />
        <IconCalendar class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      <Show when={open()}>
        <div class="absolute z-50 mt-2 w-72 rounded-md border bg-popover p-3 text-popover-foreground shadow-lg">
          <div class="mb-3 flex items-center justify-between gap-2">
            <Button type="button" variant="ghost" size="sm" class="h-8 w-8 p-0" onClick={() => moveMonth(-1)}>
              <IconChevronLeft class="h-4 w-4" />
            </Button>
            <p class="text-sm font-medium capitalize">{monthLabel()}</p>
            <Button type="button" variant="ghost" size="sm" class="h-8 w-8 p-0" onClick={() => moveMonth(1)}>
              <IconChevronRight class="h-4 w-4" />
            </Button>
          </div>
          <div class="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
            <span>Pzt</span>
            <span>Sal</span>
            <span>Çar</span>
            <span>Per</span>
            <span>Cum</span>
            <span>Cmt</span>
            <span>Paz</span>
          </div>
          <div class="mt-1 grid grid-cols-7 gap-1">
            <For each={days()}>
              {(date) => (
                <Show when={date} fallback={<span class="h-8" />}>
                  {(day) => (
                    <Button
                      type="button"
                      variant={sameDay(selected(), day()) ? "default" : "ghost"}
                      size="sm"
                      class="h-8 rounded-sm p-0 text-xs"
                      onClick={() => pick(day())}
                    >
                      {day().getDate()}
                    </Button>
                  )}
                </Show>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
}
