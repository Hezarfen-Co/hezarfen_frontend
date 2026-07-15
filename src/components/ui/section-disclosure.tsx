import type { JSX, ParentProps } from "solid-js";
import { IconChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export function SectionDisclosure(props: ParentProps<{
  open: boolean;
  onToggle: () => void;
  title: string;
  description?: string;
  meta?: JSX.Element;
  actions?: JSX.Element;
  class?: string;
}>) {
  return (
    <section class={cn("data-shell overflow-hidden", props.class)}>
      <div class="flex flex-wrap items-center gap-2 border-b border-border bg-muted/25 px-4 py-3">
        <button
          type="button"
          class="flex min-w-0 flex-1 items-center gap-3 text-left outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={props.open}
          onClick={props.onToggle}
        >
          <IconChevronRight class={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150", props.open && "rotate-90")} />
          <span class="min-w-0 flex-1">
            <span class="block truncate font-display text-lg font-semibold">{props.title}</span>
            {props.description && <span class="mt-1 block truncate text-sm text-muted-foreground">{props.description}</span>}
          </span>
        </button>
        <div class="flex items-center gap-2 [&>button]:h-8 [&>button]:min-w-32 [&>button]:justify-center [&>div]:h-8 [&>div]:min-w-8 [&>div]:justify-center">
          {props.meta}
          {props.actions}
        </div>
      </div>
      <div
        class={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
          props.open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
        aria-hidden={!props.open}
      >
        <div class="min-h-0 overflow-hidden">
          <div class={cn("space-y-4 p-4 transition-opacity duration-150 motion-reduce:transition-none", props.open ? "opacity-100" : "opacity-0")}>
            {props.children}
          </div>
        </div>
      </div>
    </section>
  );
}
