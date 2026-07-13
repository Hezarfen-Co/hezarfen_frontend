import type { JSX, ParentProps } from "solid-js";
import { Show } from "solid-js";
import { cn } from "@/lib/cn";

export type PageAccent = "mint" | "sky" | "amber" | "violet" | "rose";

export function PageHeader(
  props: ParentProps<{
    eyebrow?: string;
    title: string;
    description?: string;
    accent?: PageAccent;
    actions?: JSX.Element;
    class?: string;
    /** Compact greeting strip (dashboard). */
    compact?: boolean;
  }>,
) {
  return (
    <div
      class={cn(
        "surface-card relative overflow-hidden text-card-foreground",
        props.class,
      )}
    >
      <div class="pointer-events-none absolute inset-0 bg-muted/25" />
      <div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
      <div
        class={cn(
          "relative flex flex-col sm:flex-row sm:items-center sm:justify-between",
          props.compact
            ? "gap-3 px-4 py-3 sm:px-5 sm:py-3.5"
            : "gap-3 px-4 py-4 sm:items-end sm:px-5 sm:py-5",
        )}
      >
        <div class={cn("min-w-0", props.compact ? "space-y-0.5" : "max-w-2xl space-y-1")}>
          <Show when={props.eyebrow && !props.compact}>
            <p class="text-xs font-medium text-muted-foreground">{props.eyebrow}</p>
          </Show>
          <h1
            class={cn(
              "font-display font-semibold tracking-tight",
              props.compact ? "text-lg sm:text-xl" : "text-xl sm:text-2xl",
            )}
          >
            {props.title}
          </h1>
          <Show when={props.description}>
            <p
              class={cn(
                "text-muted-foreground",
                props.compact ? "text-xs sm:text-sm" : "text-sm",
              )}
            >
              {props.description}
            </p>
          </Show>
          {props.children}
        </div>
        <Show when={props.actions}>
          <div class="flex shrink-0 flex-wrap items-center gap-2">{props.actions}</div>
        </Show>
      </div>
    </div>
  );
}
