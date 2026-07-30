import type { JSX, ParentProps } from "solid-js";
import { Show } from "solid-js";
import { cn } from "@/lib/cn";

export function PageHeader(
  props: ParentProps<{
    eyebrow?: string;
    title: string;
    description?: string;
    actions?: JSX.Element;
    class?: string;
    /** Compact greeting strip (dashboard). */
    compact?: boolean;
  }>,
) {
  return (
    <div
      class={cn(
        "rounded-xl border border-border/60 bg-card text-card-foreground shadow-sm",
        props.class,
      )}
    >
      <div
        class={cn(
          "flex flex-col sm:flex-row sm:items-center sm:justify-between",
          props.compact
            ? "gap-3 px-4 py-3 sm:px-5 sm:py-3.5"
            : "gap-4 px-4 py-4 sm:px-5 sm:py-5",
        )}
      >
        <div class={cn("min-w-0", props.compact ? "space-y-0.5" : "max-w-2xl space-y-1")}>
          <Show when={props.eyebrow && !props.compact}>
            <p class="text-xs font-medium text-muted-foreground">{props.eyebrow}</p>
          </Show>
          <h1
            class={cn(
              "font-semibold tracking-tight",
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
