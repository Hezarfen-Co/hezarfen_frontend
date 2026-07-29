import { For, Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";
import { IconCalendar, IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { usePreferences } from "@/stores/preferences-context";

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

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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
  const { locale } = usePreferences();
  let root: HTMLDivElement | undefined;
  let panel: HTMLDivElement | undefined;
  const [open, setOpen] = createSignal(false);
  const [position, setPosition] = createSignal({ left: 0, top: 0, width: 288 });
  const selected = createMemo(() => parseDate(props.value));
  const [month, setMonth] = createSignal(selected() ?? new Date());
  const today = new Date();
  const days = createMemo(() => monthDays(month()));
  const monthLabel = createMemo(() =>
    new Intl.DateTimeFormat(locale(), { month: "long", year: "numeric" }).format(month()),
  );
  const todayLabel = createMemo(() => locale().startsWith("tr") ? "Bugün" : "Today");
  const dayHeaders = createMemo(() => {
    const base = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return new Intl.DateTimeFormat(locale(), { weekday: "short" }).format(d);
    });
  });

  createEffect(() => {
    const date = selected();
    if (date) setMonth(date);
  });

  createEffect(() => {
    if (!open()) return;
    const updatePosition = () => {
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const panelWidth = Math.min(288, Math.max(240, window.innerWidth - 24));
      const left = Math.min(Math.max(12, rect.left), window.innerWidth - panelWidth - 12);
      const estimatedHeight = 300;
      const viewportPadding = 12;
      const availableBelow = window.innerHeight - rect.bottom - viewportPadding;
      const availableAbove = rect.top - viewportPadding;
      const opensAbove = availableBelow < estimatedHeight && availableAbove > availableBelow;
      const rawTop = opensAbove ? rect.top - estimatedHeight - 8 : rect.bottom + 8;
      const maxTop = Math.max(viewportPadding, window.innerHeight - estimatedHeight - viewportPadding);
      const top = Math.min(Math.max(viewportPadding, rawTop), maxTop);
      setPosition({ left, top, width: panelWidth });
    };
    updatePosition();
    const closeOnOutside = (event: PointerEvent) => {
      if (root && !root.contains(event.target as Node) && panel && !panel.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", closeOnOutside);
    onCleanup(() => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", closeOnOutside);
    });
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
          class={cn("pr-9 placeholder:text-muted-foreground/45", props.class)}
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
        <Portal>
          <div
            ref={panel}
            data-kb-top-layer=""
            class="pointer-events-auto fixed z-80 rounded-2xl border border-black/8 bg-popover/95 p-2.5 text-popover-foreground shadow-apple backdrop-blur-xl dark:border-white/12"
            style={{ left: `${position().left}px`, top: `${position().top}px`, width: `${position().width}px` }}
            on:pointerdown={(e) => e.stopPropagation()}
          >
            <div class="mb-3 flex items-center justify-between gap-2">
              <button type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground active:scale-[0.96] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring" onClick={() => moveMonth(-1)}>
                <IconChevronLeft class="h-4 w-4" />
              </button>
              <p class="min-w-0 truncate px-2 text-sm font-semibold capitalize">{monthLabel()}</p>
              <button type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground active:scale-[0.96] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring" onClick={() => moveMonth(1)}>
                <IconChevronRight class="h-4 w-4" />
              </button>
            </div>
            <div class="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
              <For each={dayHeaders()}>{(day) => <span>{day}</span>}</For>
            </div>
            <div class="mt-1 grid grid-cols-7 gap-0.5">
              <For each={days()}>
                {(date) => (
                  <Show when={date} fallback={<span class="h-9" />}>
                    {(day) => (
                      <button
                        type="button"
                        class={cn(
                          "inline-flex h-9 items-center justify-center rounded-xl border border-transparent p-0 text-xs font-medium transition-all hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]",
                          isSameDay(today, day()) && "border-primary/50 text-primary",
                          sameDay(selected(), day()) && "border-primary bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 hover:text-primary-foreground",
                        )}
                        onClick={(event) => {
                          event.stopPropagation();
                          pick(day());
                        }}
                      >
                        {day().getDate()}
                      </button>
                    )}
                  </Show>
                )}
              </For>
            </div>
            <button
              type="button"
              class="mt-2 inline-flex h-10 w-full items-center justify-center rounded-xl border bg-background/80 px-3 text-xs font-medium text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground active:scale-[0.98] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              onClick={(event) => {
                event.stopPropagation();
                pick(today);
              }}
            >
              {todayLabel()}
            </button>
          </div>
        </Portal>
      </Show>
    </div>
  );
}
