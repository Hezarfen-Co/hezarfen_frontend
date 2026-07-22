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
        "flex h-11 w-full rounded-xl border border-border/80 bg-muted/30 px-3.5 py-2 text-sm text-foreground transition-all duration-150 hover:bg-muted/50 hover:border-border focus:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>option]:bg-popover [&>option]:text-popover-foreground",
        local.class,
      )}
      {...rest}
    />
  );
}
