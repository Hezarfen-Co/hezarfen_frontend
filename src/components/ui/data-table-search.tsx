import { Show } from "solid-js";
import { IconSearch, IconX } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

export type DataTableSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  class?: string;
};

/** Rounded search field: leading icon + conditional clear (X) button. */
export function DataTableSearch(props: DataTableSearchProps) {
  return (
    <div class={cn("relative w-full sm:max-w-xs", props.class)}>
      <IconSearch class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={props.value}
        onInput={(event) => props.onChange(event.currentTarget.value)}
        placeholder={props.placeholder ?? "Ara"}
        class={cn("h-9 rounded-lg bg-muted/40", props.value ? "pl-9 pr-8" : "pl-9")}
      />
      <Show when={props.value}>
        <button
          type="button"
          aria-label="Aramayı temizle"
          onClick={() => props.onChange("")}
          class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <IconX class="h-4 w-4" />
        </button>
      </Show>
    </div>
  );
}
