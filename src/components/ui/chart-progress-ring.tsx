import { For, Show, createEffect, createMemo, createSignal, type Component } from "solid-js";
import { cn } from "@/lib/cn";
import { TablePagination } from "@/components/ui/table-pagination";
import { useT } from "@/stores/preferences-context";

export type ProgressRingSegment = {
  id: string;
  label: string;
  value: number;
  colorClass: string;
};

export type ChartProgressRingProps = {
  title?: string;
  subtitle?: string;
  valueText?: string;
  subtext?: string;
  segments: ProgressRingSegment[];
  total?: number;
  class?: string;
  /** When set and segments.length exceeds it, the legend is paged with Prev/Next controls. */
  itemsPerPage?: number;
};

export const ChartProgressRing: Component<ChartProgressRingProps> = (props) => {
  const t = useT();
  const [pageIndex, setPageIndex] = createSignal(0);
  // The gauge bar above always renders every segment's share of the total —
  // only the legend cards below it are paged.
  const calculatedTotal = () => props.total ?? props.segments.reduce((acc, s) => acc + s.value, 0);

  const pageCount = createMemo(() =>
    props.itemsPerPage ? Math.max(1, Math.ceil(props.segments.length / props.itemsPerPage)) : 1,
  );
  createEffect(() => {
    if (pageIndex() >= pageCount()) setPageIndex(Math.max(0, pageCount() - 1));
  });
  const visibleSegments = createMemo(() => {
    if (!props.itemsPerPage) return props.segments;
    const start = pageIndex() * props.itemsPerPage;
    return props.segments.slice(start, start + props.itemsPerPage);
  });

  return (
    <div class={cn("flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-sm", props.class)}>
      <Show when={props.title}>
        <div class="border-b border-border pb-3">
          <div>
            <h3 class="text-sm font-semibold tracking-tight text-foreground">{props.title}</h3>
            <Show when={props.subtitle}>
              <p class="text-xs text-muted-foreground mt-0.5">{props.subtitle}</p>
            </Show>
          </div>
        </div>
      </Show>

      <Show
        when={calculatedTotal() > 0}
        fallback={
          <div class="px-4 py-8 text-center">
            <p class="text-xs font-semibold text-foreground/80">{t("dashboard.chartEmpty")}</p>
            <p class="text-[11px] text-muted-foreground mt-0.5">{t("dashboard.chartEmptyHint")}</p>
          </div>
        }
      >
        <div class="flex flex-col justify-between gap-4 py-1">
          {/* Total Stat Highlight */}
          <div class="flex items-baseline gap-2">
            <span class="font-mono text-3xl font-bold tracking-tight text-foreground">
              {props.valueText ?? calculatedTotal()}
            </span>
            <Show when={props.subtext}>
              <span class="text-xs font-medium text-muted-foreground">{props.subtext}</span>
            </Show>
          </div>

          {/* Multi-Segmented Progress Gauge Bar */}
          <div class="flex h-3.5 w-full overflow-hidden rounded-full bg-muted/60 dark:bg-muted/40 p-0.5 border border-border/40">
            <For each={props.segments}>
              {(segment) => {
                const pct = () => (calculatedTotal() > 0 ? (segment.value / calculatedTotal()) * 100 : 0);
                return (
                  <Show when={pct() > 0}>
                    <div
                      class={cn("h-full rounded-full transition-all duration-500 ease-out", segment.colorClass)}
                      style={{ width: `${pct()}%` }}
                      title={`${segment.label}: ${segment.value} (${Math.round(pct())}%)`}
                    />
                  </Show>
                );
              }}
            </For>
          </div>

          {/* Legend Grid */}
          <div class="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-2">
            <For each={visibleSegments()}>
              {(segment) => (
                <div class="flex items-center justify-between rounded-xl border border-border/40 bg-muted/30 px-3 py-2 text-xs">
                  <div class="flex items-center gap-2 truncate">
                    <span class={cn("h-2.5 w-2.5 shrink-0 rounded-full", segment.colorClass)} />
                    <span class="truncate font-medium text-muted-foreground">{segment.label}</span>
                  </div>
                  <span class="font-mono font-semibold text-foreground ml-2">{segment.value}</span>
                </div>
              )}
            </For>
          </div>

          <Show when={props.itemsPerPage && pageCount() > 1}>
            <TablePagination
              pageIndex={pageIndex()}
              pageCount={pageCount()}
              pageSize={props.itemsPerPage!}
              total={props.segments.length}
              onPageChange={setPageIndex}
            />
          </Show>
        </div>
      </Show>
    </div>
  );
};
