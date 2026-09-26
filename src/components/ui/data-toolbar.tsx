import { Show } from "solid-js";
import type { JSX } from "solid-js";
import { DataTableSearch } from "@/components/ui/data-table-search";
import { cn } from "@/lib/cn";

/** The card a list toolbar sits on — the same box DataTable draws. */
export const TOOLBAR_CARD = "rounded-xl border border-border-line bg-surface-base p-3 shadow-xs";

/**
 * One toolbar control: a pill, touch-sized (h-10) below `sm` and on touch
 * screens, h-8 from `sm` up, at 13px. For controls a page places by hand
 * (a stepper, a date jump) beside the slot-sized ones.
 */
export const TOOLBAR_CONTROL = "h-10 rounded-full text-[13px] sm:h-8 touch:h-10";

/**
 * The same standard applied to every button and link inside a slot, so the
 * page's plain `<Button size="sm">` (26px) lands at the toolbar height.
 * Mirrors DataTable's actions/filters slots.
 */
export const TOOLBAR_SLOT =
  "[&_button]:h-10 [&_button]:shrink-0 [&_button]:rounded-full [&_button]:px-3.5 [&_button]:text-[13px] sm:[&_button]:h-8 touch:[&_button]:h-10 [&_a]:h-10 [&_a]:rounded-full [&_a]:px-3.5 [&_a]:text-[13px] sm:[&_a]:h-8 touch:[&_a]:h-10 [&_[data-filter-active]]:border-primary [&_[data-filter-active]]:text-primary-text";

export function DataToolbar(props: {
  searchValue?: string;
  searchPlaceholder?: string;
  /** On-focus hint under the search box naming the fields it matches. */
  searchHint?: string;
  onSearchInput?: (value: string) => void;
  filters?: JSX.Element;
  actions?: JSX.Element;
  /** Let the search box grow into the free width instead of stopping at `max-w-72`. */
  inline?: boolean;
  class?: string;
}) {
  const hasSearch = () => props.searchValue !== undefined || props.searchPlaceholder !== undefined || props.onSearchInput !== undefined;
  return (
    // One wrapping row, ordered by width — the same shape as DataTable's
    // toolbar. Phones: search and actions share the first line and the
    // filters take the next one; nothing is squeezed into a fixed row, where
    // the search box shrank to a sliver and a filter painted over its icon.
    // From `sm`: search, filters, then actions pushed to the right edge.
    <div class={cn("flex flex-wrap items-center gap-2 sm:gap-3", props.class)}>
      <Show when={hasSearch()}>
        <DataTableSearch
          class={cn("order-1 w-auto min-w-40 flex-1 grow-[100]", !props.inline && "sm:max-w-72")}
          value={props.searchValue ?? ""}
          placeholder={props.searchPlaceholder}
          hint={props.searchHint}
          onChange={(value) => props.onSearchInput?.(value)}
        />
      </Show>
      <Show when={props.filters}>
        <div class={cn("order-3 flex w-full flex-wrap items-center gap-2 sm:order-2 sm:w-auto", TOOLBAR_SLOT)}>{props.filters}</div>
      </Show>
      <Show when={props.actions}>
        <div class={cn("order-2 ml-auto flex shrink-0 grow items-center justify-end gap-2 sm:order-3 sm:grow-0 max-sm:[&_button]:flex-1", TOOLBAR_SLOT)}>{props.actions}</div>
      </Show>
    </div>
  );
}
