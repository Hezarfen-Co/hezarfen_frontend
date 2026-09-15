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
  /** "md" for roomy containers such as a side panel. */
  size?: "sm" | "md";
  class?: string;
}) {
  return (
    <div class={cn("flex flex-col items-center justify-center gap-2 px-4 py-5 text-center", props.class)}>
      <Illustration name={props.illustration ?? "empty"} class={props.size === "md" ? "h-32 w-48" : "h-16 w-24"} />
      <div>
        <p class={cn("font-semibold text-foreground/80", props.size === "md" ? "text-sm" : "text-xs")}>{props.title}</p>
        <Show when={props.hint}>
          <p class={cn("mt-0.5 text-muted-foreground", props.size === "md" ? "mx-auto max-w-xs text-xs" : "text-[11px]")}>{props.hint}</p>
        </Show>
      </div>
    </div>
  );
}
