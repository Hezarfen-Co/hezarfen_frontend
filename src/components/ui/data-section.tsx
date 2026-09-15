import { Show, type JSX, type ParentProps } from "solid-js";
import { cn } from "@/lib/cn";

/**
 * The card every list page sits in: title, description and header actions,
 * then the page's toolbar and content. It matches the header DataTable draws,
 * so card-grid pages (classes, courses, boards…) read the same as table pages.
 */
export function DataSection(
  props: ParentProps<{ title?: string; description?: string; actions?: JSX.Element; class?: string }>,
) {
  return (
    <section class={cn("data-shell space-y-4 p-4 [&_.empty-state]:border-0 [&_.empty-state]:bg-transparent", props.class)}>
      <Show when={props.title || props.description || props.actions}>
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <Show when={props.title}>
              <h2 class="truncate text-lg font-semibold tracking-tight text-foreground">{props.title}</h2>
            </Show>
            <Show when={props.description}>
              <p class="mt-1 text-sm text-muted-foreground">{props.description}</p>
            </Show>
          </div>
          <Show when={props.actions}>
            <div class="flex shrink-0 flex-wrap items-center gap-2 [&_button]:h-9 [&_button]:rounded-md">{props.actions}</div>
          </Show>
        </div>
      </Show>
      {props.children}
    </section>
  );
}
