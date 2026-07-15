import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/cn";

/** Native select styled to match shadcn — lighter than Kobalte Select. */
export type SelectProps = ComponentProps<"select">;

export function Select(props: SelectProps) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <select
      class={cn(
        "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm transition-colors hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>option]:bg-popover [&>option]:text-popover-foreground",
        local.class,
      )}
      {...rest}
    />
  );
}
