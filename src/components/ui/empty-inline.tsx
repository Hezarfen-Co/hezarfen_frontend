import { Show } from "solid-js";
import { Illustration } from "@/components/ui/illustration";
import { cn } from "@/lib/cn";
import type { IllustrationName } from "@/lib/illustrations";

/** Compact empty state for cards, charts and short lists: a small scene plus
 *  one or two lines. The full-panel version is EmptyState. */
export function EmptyInline(props: {
  title: string;
  hint?: string;
  illustration?: IllustrationName;
  class?: string;
}) {
  return (
    <div class={cn("flex flex-col items-center justify-center gap-2 px-4 py-5 text-center", props.class)}>
      <Illustration name={props.illustration ?? "empty"} class="h-16 w-24" />
      <div>
        <p class="text-xs font-semibold text-foreground/80">{props.title}</p>
        <Show when={props.hint}>
          <p class="mt-0.5 text-[11px] text-muted-foreground">{props.hint}</p>
        </Show>
      </div>
    </div>
  );
}
