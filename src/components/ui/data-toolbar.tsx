import { Show } from "solid-js";
import type { JSX } from "solid-js";
import { DataTableSearch } from "@/components/ui/data-table-search";
import { cn } from "@/lib/cn";

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
        <div class="order-3 flex w-full flex-wrap items-center gap-2 sm:order-2 sm:w-auto">{props.filters}</div>
      </Show>
      <Show when={props.actions}>
        <div class="order-2 ml-auto flex shrink-0 grow items-center justify-end gap-2 sm:order-3 sm:grow-0 touch:[&_button]:h-10 max-sm:[&_button]:flex-1">{props.actions}</div>
      </Show>
    </div>
  );
}
