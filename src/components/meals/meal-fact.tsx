import type { ParentProps } from "solid-js";

/** One label/value pair in a detail header's fact row — text, not a card. */
export function MealFact(props: ParentProps<{ label: string }>) {
  return (
    <div class="min-w-0">
      <dt class="text-xs text-muted-foreground">{props.label}</dt>
      <dd class="mt-0.5 truncate text-sm font-medium text-text-strong tabular-nums">{props.children}</dd>
    </div>
  );
}
