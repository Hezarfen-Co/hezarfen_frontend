import type { JSX } from "solid-js";
import { Show } from "solid-js";
import { cn } from "@/lib/cn";

/** Dashed empty panel with optional primary action. */
export function EmptyState(props: {
  title: string;
  description?: string;
  action?: JSX.Element;
  class?: string;
}) {
  return (
    <div
      class={cn(
        "flex min-h-[12rem] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center",
        props.class,
      )}
    >
      <p class="text-sm font-medium text-foreground">{props.title}</p>
      <Show when={props.description}>
        <p class="max-w-sm text-sm leading-6 text-muted-foreground">{props.description}</p>
      </Show>
      <Show when={props.action}>
        <div class="pt-1">{props.action}</div>
      </Show>
    </div>
  );
}
