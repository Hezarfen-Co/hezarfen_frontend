import { Collapsible } from "@kobalte/core/collapsible";
import type { ParentProps } from "solid-js";
import { cn } from "@/lib/cn";

/** shadcn-style collapsible help — always starts closed. */
export function CollapsibleHelp(
  props: ParentProps<{
    title: string;
    class?: string;
  }>,
) {
  return (
    <Collapsible class={cn("group/help rounded-md border bg-card text-card-foreground shadow-sm", props.class)}>
      <Collapsible.Trigger
        class={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium outline-none transition-colors",
          "hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring",
          "ui-expanded:border-b ui-expanded:border-border",
        )}
      >
        <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-muted text-xs font-semibold text-muted-foreground">
          ?
        </span>
        <span class="flex-1">{props.title}</span>
        <svg
          viewBox="0 0 24 24"
          class="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[expanded]/help:rotate-180"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <div class="border-t border-border px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          {props.children}
        </div>
      </Collapsible.Content>
    </Collapsible>
  );
}
