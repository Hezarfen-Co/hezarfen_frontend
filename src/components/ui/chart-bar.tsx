import { For, Show, createEffect, createMemo, createSignal, type Component } from "solid-js";
import { cn } from "@/lib/cn";
import { TablePagination } from "@/components/ui/table-pagination";
import { useT } from "@/stores/preferences-context";

export type ChartBarItem = {
  id: string;
  label: string;
  value: number;
  max?: number;
  formattedValue?: string;
  colorClass?: string;
};

export type ChartBarProps = {
  title?: string;
  subtitle?: string;
  items: ChartBarItem[];
  maxScale?: number;
  class?: string;
  /** When set and items.length exceeds it, the list is paged with Prev/Next controls. */
  itemsPerPage?: number;
};

export const ChartBar: Component<ChartBarProps> = (props) => {
  const [pageIndex, setPageIndex] = createSignal(0);
  const t = useT();

  // The scale is computed off every item, not just the visible page, so bars
  // don't rescale as the reader pages through them.
  const maxValue = () => {
    if (props.maxScale != null && props.maxScale > 0) return props.maxScale;
    const itemMax = Math.max(...props.items.map((i) => i.value), 1);
    return itemMax;
  };

  const pageCount = createMemo(() =>
    props.itemsPerPage ? Math.max(1, Math.ceil(props.items.length / props.itemsPerPage)) : 1,
  );
  // A refetch can shrink the item count out from under the current page.
  createEffect(() => {
    if (pageIndex() >= pageCount()) setPageIndex(Math.max(0, pageCount() - 1));
  });
  const visibleItems = createMemo(() => {
    if (!props.itemsPerPage) return props.items;
    const start = pageIndex() * props.itemsPerPage;
    return props.items.slice(start, start + props.itemsPerPage);
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
        when={props.items.length > 0}
        fallback={
          <div class="px-4 py-8 text-center">
            <p class="text-xs font-semibold text-foreground/80">{t("dashboard.chartEmpty")}</p>
            <p class="text-[11px] text-muted-foreground mt-0.5">{t("dashboard.chartEmptyHint")}</p>
          </div>
        }
      >
        <div class="space-y-3 pt-1">
          <For each={visibleItems()}>
            {(item) => {
              const pct = () => Math.min(100, Math.max(0, (item.value / maxValue()) * 100));

              return (
                // Tooltip stays permanently mounted and toggles via CSS group-hover
                // opacity rather than a JS-driven Show — mounting/unmounting it on
                // every hover was the source of a visible jump for whichever item
                // sits at the bottom of the list, since that insert/remove briefly
                // altered the card's content.
                <div class="group relative">
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between text-xs">
                      <span class="font-medium text-foreground/90 truncate max-w-[70%]">
                        {item.label}
                      </span>
                      <span class="font-mono text-xs font-semibold tabular-nums text-foreground">
                        {item.formattedValue ?? item.value}
                      </span>
                    </div>

                    <div class="relative h-2.5 w-full overflow-hidden rounded-full bg-muted/60 dark:bg-muted/40">
                      <div
                        class={cn(
                          "h-full rounded-full transition-all duration-500 ease-out",
                          item.colorClass ?? "bg-primary",
                          "group-hover:brightness-110 group-hover:shadow-xs",
                        )}
                        style={{ width: `${pct()}%` }}
                      />
                    </div>
                  </div>

                  <div class="pointer-events-none absolute -top-7 right-0 z-20 rounded-lg bg-popover px-2.5 py-1 text-[11px] font-medium text-popover-foreground opacity-0 shadow-md border border-border transition-opacity group-hover:opacity-100">
                    {item.label}: {item.formattedValue ?? item.value} ({Math.round(pct())}%)
                  </div>
                </div>
              );
            }}
          </For>
        </div>

        <Show when={props.itemsPerPage && pageCount() > 1}>
          <TablePagination
            pageIndex={pageIndex()}
            pageCount={pageCount()}
            pageSize={props.itemsPerPage!}
            total={props.items.length}
            onPageChange={setPageIndex}
          />
        </Show>
      </Show>
    </div>
  );
};
