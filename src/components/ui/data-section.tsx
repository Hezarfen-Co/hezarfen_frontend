import { Show, type JSX, type ParentProps } from "solid-js";
import { TOOLBAR_SLOT } from "@/components/ui/data-toolbar";
import { cn } from "@/lib/cn";

/**
 * The card every list page sits in: title, description and header actions,
 * then the page's toolbar and content. It matches the header DataTable draws,
 * so card-grid pages (classes, courses, boards…) read the same as table pages.
 *
 * Like DataTable, the title is not drawn: the shell already names the page
 * (the header on desktop, its own h1 on phones), and a second copy read as a
 * duplicate heading. It still labels the section for assistive tech.
 */
export function DataSection(
  props: ParentProps<{ title?: string; description?: string; actions?: JSX.Element; class?: string }>,
) {
  return (
    <section aria-label={props.title} class={cn("data-shell space-y-4 p-4 [&_.empty-state]:border-0 [&_.empty-state]:bg-transparent", props.class)}>
      <Show when={props.description || props.actions}>
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <Show when={props.description}>
              <p class="text-sm text-muted-foreground">{props.description}</p>
            </Show>
          </div>
          <Show when={props.actions}>
            {/* Header actions are toolbar controls too: the same pill and height
                as a DataTable toolbar, never a taller h-9 button of their own. */}
            <div class={cn("flex min-w-0 flex-wrap items-center gap-2", TOOLBAR_SLOT)}>{props.actions}</div>
          </Show>
        </div>
      </Show>
      {props.children}
    </section>
  );
}
