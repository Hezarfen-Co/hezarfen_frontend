import type { Component } from "solid-js";
import { Show } from "solid-js";

export type StatTileProps = {
  label: string;
  value: string;
  caption?: string;
  Icon: Component<{ class?: string }>;
};

/** Figma "Web / Stat Tile": subtle label + icon on top, a large mono value, an
 * optional plain-text caption below. No delta arrow is drawn here — this
 * project has no historical baseline to diff against, and a fabricated trend
 * is worse than none. */
export function StatTile(props: StatTileProps) {
  return (
    <div class="flex flex-col gap-1.5 rounded-xl border border-border-line bg-surface-base px-4 py-3.5 shadow-sm">
      <div class="flex items-center gap-2">
        <p class="min-w-0 flex-1 truncate text-[13px] font-medium text-text-subtle">{props.label}</p>
        <props.Icon class="h-[13px] w-[13px] shrink-0 text-text-subtle" />
      </div>
      <p class="mono tabular-nums text-[26px] font-semibold leading-8 tracking-[-0.02em] text-text-strong">{props.value}</p>
      <Show when={props.caption}>
        <p class="truncate text-[13px] text-text-subtle">{props.caption}</p>
      </Show>
    </div>
  );
}
