import { Show, type Component } from "solid-js";
import { cn } from "@/lib/cn";

export type ChartComparatorBarProps = {
  label: string;
  /** Where the fill ends, as a 0..1 fraction of the track. */
  fraction: number;
  /** The value as the caller already formatted it — a percent, a mark, a count. */
  valueText: string;
  /**
   * The baseline this value is read against (a cohort median, a class average)
   * as a fraction of the same track. Null when the service withheld it, and
   * then the bar is drawn without a tick rather than against a guessed one.
   */
  comparatorFraction?: number | null;
  /** What the baseline is, e.g. "sınıf ortalaması". */
  comparatorLabel?: string;
  comparatorText?: string | null;
  /** The signed distance between value and baseline, formatted by the caller. */
  gapText?: string | null;
  class?: string;
};

const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

/**
 * One value read against one baseline, in the width of a table row: the fill is
 * the value, the tick across it is the baseline.
 *
 * Both numbers stay printed next to the bar rather than being encoded in it —
 * the bar is the quick read, the text is the actual claim, so the comparison
 * survives for a reader who cannot separate the two colours (WCAG 1.4.1).
 */
export const ChartComparatorBar: Component<ChartComparatorBarProps> = (props) => {
  const fill = () => clamp(props.fraction);
  const tick = () => (props.comparatorFraction == null ? null : clamp(props.comparatorFraction));
  const ariaLabel = () =>
    [
      `${props.label}: ${props.valueText}`,
      props.comparatorText ? `${props.comparatorLabel ?? ""} ${props.comparatorText}`.trim() : null,
      props.gapText,
    ]
      .filter(Boolean)
      .join(", ");

  return (
    <div class={cn("space-y-1", props.class)} role="img" aria-label={ariaLabel()}>
      <div class="flex items-baseline justify-between gap-3">
        <span class="min-w-0 truncate text-xs text-muted-foreground">{props.label}</span>
        <span class="shrink-0 text-sm font-semibold tabular-nums text-text-strong">{props.valueText}</span>
      </div>
      <div class="relative h-2 overflow-hidden rounded-full bg-surface-overlay">
        <div class="h-full rounded-full bg-primary" style={{ width: `${fill() * 100}%` }} />
        <Show when={tick() != null}>
          {/* Pulled half its own width back so the tick sits on the baseline,
              not just past it; the last pixel stays inside the track. */}
          <span
            class="absolute inset-y-0 w-0.5 -translate-x-1/2 rounded-full bg-text-strong"
            style={{ left: `${tick()! * 100}%` }}
          />
        </Show>
      </div>
      <Show when={props.comparatorText || props.gapText}>
        <p class="flex flex-wrap items-baseline gap-x-2 text-[11px] leading-5 text-muted-foreground">
          <Show when={props.comparatorText}>
            {(text) => (
              <span>
                <Show when={props.comparatorLabel}>
                  <span>{props.comparatorLabel}: </span>
                </Show>
                <span class="font-medium tabular-nums">{text()}</span>
              </span>
            )}
          </Show>
          <Show when={props.gapText}>
            {(gap) => <span class="font-medium tabular-nums text-text-strong">{gap()}</span>}
          </Show>
        </p>
      </Show>
    </div>
  );
};
