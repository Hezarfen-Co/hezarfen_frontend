import type { JSX, ParentProps } from "solid-js";
import { Show } from "solid-js";
import { cn } from "@/lib/cn";

export type PageAccent = "mint" | "sky" | "amber" | "violet" | "rose";

const ACCENT: Record<PageAccent, string> = {
  mint: "from-emerald-500/10 via-transparent to-transparent",
  sky: "from-sky-500/10 via-transparent to-transparent",
  amber: "from-amber-500/10 via-transparent to-transparent",
  violet: "from-violet-500/10 via-transparent to-transparent",
  rose: "from-rose-500/10 via-transparent to-transparent",
};

export function PageHeader(
  props: ParentProps<{
    eyebrow?: string;
    title: string;
    description?: string;
    accent?: PageAccent;
    actions?: JSX.Element;
    class?: string;
  }>,
) {
  return (
    <div
      class={cn(
        "relative overflow-hidden rounded-md border bg-card text-card-foreground shadow-sm",
        props.class,
      )}
    >
      <div
        class={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br",
          ACCENT[props.accent ?? "mint"],
        )}
      />
      <div class="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
        <div class="max-w-2xl space-y-1.5">
          <Show when={props.eyebrow}>
            <p class="text-xs font-medium text-muted-foreground">{props.eyebrow}</p>
          </Show>
          <h1 class="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {props.title}
          </h1>
          <Show when={props.description}>
            <p class="text-sm text-muted-foreground sm:text-base">{props.description}</p>
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
