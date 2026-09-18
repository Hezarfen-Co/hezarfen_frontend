import { For, Show, createMemo, type Component } from "solid-js";
import { cn } from "@/lib/cn";
import { usePreferences, useT } from "@/stores/preferences-context";
import { EmptyInline } from "@/components/ui/empty-inline";

/** One dated observation. Several entries may share a day — they are summed. */
export type HeatmapEntry = {
  /** Epoch millis. Bucketed into a local-time calendar day. */
  at: number;
  /** Amount contributed by this entry (minutes, records, …). */
  value: number;
};

export type ChartHeatmapProps = {
  title?: string;
  subtitle?: string;
  entries: HeatmapEntry[];
  /** Calendar weeks to render, ending with the week containing `endsAt`. */
  weeks?: number;
  /** Right-hand edge of the range; defaults to now. */
  endsAt?: number;
  /** Cell tooltip / screen-reader text for a day that has data. */
  dayLabel: (value: number, dayStart: number) => string;
  /** Cell text for an empty day. */
  emptyDayLabel: (dayStart: number) => string;
  /** Summary line under the grid, e.g. "312 dk odak · son 26 hafta". */
  footer?: string;
  class?: string;
};

const DEFAULT_WEEKS = 26;

/** Local midnight for the day containing `ms` — DST-safe, unlike `ms - ms % DAY_MS`. */
function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Local midnight of the Monday on or before `ms`. */
function startOfWeek(ms: number): number {
  const d = new Date(startOfDay(ms));
  // getDay(): 0 = Sunday. Shift so Monday is column-row 0.
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

/**
 * GitHub-contribution-style calendar. Columns are weeks (oldest → newest),
 * rows are Monday → Sunday. Intensity is bucketed against the busiest day in
 * range, so the scale is always relative to real data rather than a guess.
 */
export const ChartHeatmap: Component<ChartHeatmapProps> = (props) => {
  const t = useT();
  const { locale } = usePreferences();

  const weeks = () => props.weeks ?? DEFAULT_WEEKS;

  // Totals per local day, keyed by that day's midnight timestamp.
  const totals = createMemo(() => {
    const map = new Map<number, number>();
    for (const entry of props.entries) {
      if (!Number.isFinite(entry.at) || entry.value <= 0) continue;
      const day = startOfDay(entry.at);
      map.set(day, (map.get(day) ?? 0) + entry.value);
    }
    return map;
  });

  const firstWeekStart = createMemo(() => {
    const lastWeek = startOfWeek(props.endsAt ?? Date.now());
    const d = new Date(lastWeek);
    d.setDate(d.getDate() - (weeks() - 1) * 7);
    return d.getTime();
  });

  // Columns of 7 local-midnight timestamps. Built by date arithmetic rather
  // than fixed DAY_MS steps so a DST shift can't slide the grid by an hour.
  const columns = createMemo(() => {
    const start = firstWeekStart();
    return Array.from({ length: weeks() }, (_, week) =>
      Array.from({ length: 7 }, (_, day) => {
        const d = new Date(start);
        d.setDate(d.getDate() + week * 7 + day);
        return d.getTime();
      }),
    );
  });

  const maxValue = createMemo(() => Math.max(0, ...totals().values()));
  const todayStart = createMemo(() => startOfDay(props.endsAt ?? Date.now()));

  /** 0 = no data, 1..4 = quartiles of the busiest day. */
  const levelOf = (value: number) => {
    if (value <= 0) return 0;
    const peak = maxValue();
    if (peak <= 0) return 0;
    return Math.min(4, Math.ceil((value / peak) * 4));
  };

  const levelClasses = [
    "bg-muted/60 dark:bg-muted/30",
    "bg-primary/25",
    "bg-primary/45",
    "bg-primary/70",
    "bg-primary",
  ];

  const monthFormat = createMemo(
    () => new Intl.DateTimeFormat(locale() === "tr" ? "tr-TR" : "en-GB", { month: "short" }),
  );
  const weekdayFormat = createMemo(
    () => new Intl.DateTimeFormat(locale() === "tr" ? "tr-TR" : "en-GB", { weekday: "short" }),
  );

  // A month label sits above the first column whose Monday opens a new month.
  const monthLabels = createMemo(() =>
    columns().map((week, index) => {
      const monday = new Date(week[0]);
      if (index > 0) {
        const previous = new Date(columns()[index - 1][0]);
        if (previous.getMonth() === monday.getMonth()) return "";
      }
      return monthFormat().format(monday);
    }),
  );

  // Monday / Wednesday / Friday only — the full seven would not fit the gutter.
  const weekdayLabels = createMemo(() => {
    const week = columns()[0] ?? [];
    return week.map((day, index) => (index % 2 === 0 && index < 6 ? weekdayFormat().format(day) : ""));
  });

  const hasData = createMemo(() => maxValue() > 0);

  return (
    <div class={cn("flex flex-col gap-4 rounded-xl border border-border-line bg-surface-base p-4", props.class)}>
      <Show when={props.title}>
        <div class="border-b border-border-hairline pb-3">
          <h3 class="text-sm font-semibold tracking-tight text-foreground">{props.title}</h3>
          <Show when={props.subtitle}>
            <p class="mt-0.5 text-xs text-muted-foreground">{props.subtitle}</p>
          </Show>
        </div>
      </Show>

      <Show
        when={hasData()}
        fallback={
          <EmptyInline illustration="charts" title={t("dashboard.chartEmpty")} hint={t("dashboard.chartEmptyHint")} />
        }
      >
        {/* One grid for labels and cells together: a weekday gutter column plus
            an equal fraction per week, so the calendar always spans the card's
            full width and every label stays on its own row. Below the min-width
            it scrolls instead of shrinking cells past legibility. */}
        {/* `px-1` keeps today's focus ring off the scroll container's clip
            edge, which otherwise shaves the last column's cells in half. */}
        <div class="overflow-x-auto px-1 pb-1">
          <div
            class="grid min-w-[460px] gap-1"
            style={{ "grid-template-columns": `auto repeat(${weeks()}, minmax(0, 1fr))` }}
          >
            <span aria-hidden="true" />
            <For each={monthLabels()}>
              {(label) => (
                <span class="text-[11px] leading-none text-muted-foreground">{label}</span>
              )}
            </For>

            <For each={weekdayLabels()}>
              {(weekdayLabel, dayIndex) => (
                <>
                  <span class="pr-1 text-right text-[11px] leading-none text-muted-foreground">
                    {weekdayLabel}
                  </span>
                  <For each={columns()}>
                    {(week) => {
                      const day = week[dayIndex()];
                      const value = () => totals().get(day) ?? 0;
                      // Days after today are outside the observable range —
                      // drawn as an empty slot so the last week keeps its shape.
                      const future = () => day > todayStart();
                      const label = () =>
                        value() > 0 ? props.dayLabel(value(), day) : props.emptyDayLabel(day);
                      return (
                        <Show
                          when={!future()}
                          fallback={
                            // Days after today simply do not exist yet. They hold
                            // the last column's shape but stay invisible — an
                            // outlined placeholder reads as a half-drawn cell.
                            <span aria-hidden="true" class="aspect-square w-full" />
                          }
                        >
                          <span
                            class={cn(
                              "aspect-square w-full rounded-[3px] transition-colors",
                              levelClasses[levelOf(value())],
                              day === todayStart() && "ring-1 ring-ring",
                            )}
                            title={label()}
                            aria-label={label()}
                            role="img"
                          />
                        </Show>
                      );
                    }}
                  </For>
                </>
              )}
            </For>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 border-t border-border-hairline pt-3">
          <Show when={props.footer}>
            <p class="text-[11px] text-muted-foreground">{props.footer}</p>
          </Show>
          <div class="ml-auto flex items-center gap-1.5">
            <span class="text-[11px] text-muted-foreground">{t("dashboard.heatmapLess")}</span>
            <For each={levelClasses}>
              {(levelClass) => <span class={cn("h-3 w-3 rounded-[3px]", levelClass)} />}
            </For>
            <span class="text-[11px] text-muted-foreground">{t("dashboard.heatmapMore")}</span>
          </div>
        </div>
      </Show>
    </div>
  );
};
