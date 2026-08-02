import { Show } from "solid-js";
import type { JSX } from "solid-js";
import { DataTableSearch } from "@/components/ui/data-table-search";
import { cn } from "@/lib/cn";

export function DataToolbar(props: {
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchInput?: (value: string) => void;
  filters?: JSX.Element;
  actions?: JSX.Element;
  inline?: boolean;
  class?: string;
}) {
  const hasSearch = () => props.searchValue !== undefined || props.searchPlaceholder !== undefined || props.onSearchInput !== undefined;
  return (
    <div class={cn("flex gap-3", props.inline ? "flex-row items-center" : "flex-col sm:flex-row sm:items-center sm:justify-between", props.class)}>
      <div class={cn("flex min-w-0 flex-1 gap-2", props.inline ? "flex-row flex-nowrap items-center" : "flex-col sm:flex-row sm:flex-wrap sm:items-center")}>
        <Show when={hasSearch()}>
          <DataTableSearch
            class={cn("sm:max-w-72", props.inline && "min-w-0 flex-1")}
            value={props.searchValue ?? ""}
            placeholder={props.searchPlaceholder}
            onChange={(value) => props.onSearchInput?.(value)}
          />
        </Show>
        {props.filters}
      </div>
      <Show when={props.actions}>
        <div class="flex shrink-0 items-center gap-2 sm:justify-end">{props.actions}</div>
      </Show>
    </div>
  );
}
