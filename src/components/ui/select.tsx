import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/cn";

/** Native select styled to match shadcn — lighter than Kobalte Select. */
export type SelectProps = ComponentProps<"select">;

export function Select(props: SelectProps) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <div class="relative w-full">
      <select
        class={cn(
          "flex h-11 w-full appearance-none rounded-xl border border-border/80 bg-muted/30 pl-3.5 pr-9 py-2 text-sm font-medium text-foreground transition-all duration-150",
          "hover:bg-muted/50 hover:border-border focus:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50 [&>option]:bg-popover [&>option]:text-popover-foreground [&>option]:py-1.5",
          local.class,
        )}
        {...rest}
      />
      <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70">
        <svg class="h-4 w-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </span>
    </div>
  );
}
