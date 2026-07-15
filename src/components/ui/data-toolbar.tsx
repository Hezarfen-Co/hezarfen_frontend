import { Show } from "solid-js";
import type { JSX } from "solid-js";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export function DataToolbar(props: {
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchInput?: (value: string) => void;
  filters?: JSX.Element;
  actions?: JSX.Element;
  class?: string;
}) {
  const hasSearch = () => props.searchValue !== undefined || props.searchPlaceholder !== undefined || props.onSearchInput !== undefined;
  return (
    <div class={cn("flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", props.class)}>
      <div class="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <Show when={hasSearch()}>
          <Input
            class="h-9 w-full rounded-sm sm:max-w-xs"
            value={props.searchValue ?? ""}
            placeholder={props.searchPlaceholder}
            onInput={(e) => props.onSearchInput?.(e.currentTarget.value)}
          />
        </Show>
        {props.filters}
      </div>
      <div class="flex shrink-0 items-center gap-2">{props.actions}</div>
    </div>
  );
}
