import { Show } from "solid-js";
import { cn } from "@/lib/cn";

/** Clean dashed empty panel. */
export function EmptyState(props: {
  title: string;
  description?: string;
  class?: string;
}) {
  return (
    <div
      class={cn(
        "flex min-h-[10rem] flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 py-8 text-center",
        props.class,
      )}
    >
      <p class="text-sm font-semibold text-foreground">{props.title}</p>
      <Show when={props.description}>
        <p class="max-w-sm text-xs leading-relaxed text-muted-foreground">{props.description}</p>
      </Show>
    </div>
  );
}
