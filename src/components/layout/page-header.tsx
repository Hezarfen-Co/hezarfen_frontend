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
        "text-foreground",
        props.class,
      )}
    >
      <div
        class={cn(
          "flex flex-col sm:flex-row sm:items-center sm:justify-between",
          props.compact
            ? "min-h-[66px] gap-3 py-1"
            : "min-h-[66px] gap-4 py-1",
        )}
      >
        <div class={cn("min-w-0", props.compact ? "space-y-0.5" : "max-w-2xl space-y-1")}>
          <Show when={props.eyebrow && !props.compact}>
            <p class="text-xs font-medium text-muted-foreground">{props.eyebrow}</p>
          </Show>
          <h1
            class={cn(
              "font-semibold tracking-tight",
              props.compact
                ? "text-xl leading-7 sm:text-[28px] sm:leading-9"
                : "text-2xl leading-8 sm:text-[28px] sm:leading-9",
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
          <div class="flex min-w-0 flex-wrap items-center gap-2">{props.actions}</div>
        </Show>
      </div>
    </div>
  );
}
