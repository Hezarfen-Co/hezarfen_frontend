import { For, Show, type Component } from "solid-js";
import { cn } from "@/lib/cn";

export type ProgressRingSegment = {
  id: string;
  label: string;
  value: number;
  colorClass: string;
};

export type ChartProgressRingProps = {
  title?: string;
  subtitle?: string;
  valueText?: string;
  subtext?: string;
  segments: ProgressRingSegment[];
  total?: number;
  class?: string;
};

export const ChartProgressRing: Component<ChartProgressRingProps> = (props) => {
  const calculatedTotal = () => props.total ?? props.segments.reduce((acc, s) => acc + s.value, 0);

  return (
    <div class={cn("flex flex-col gap-3.5 rounded-3xl border border-border/60 bg-card/60 p-4 sm:p-5 dark:border-white/[0.08] dark:bg-card/40 shadow-sm backdrop-blur-sm", props.class)}>
      <Show when={props.title}>
        <div class="flex items-center justify-between gap-2 border-b border-border/40 pb-3">
          <div>
            <h3 class="text-sm font-semibold tracking-tight text-foreground">{props.title}</h3>
            <Show when={props.subtitle}>
              <p class="text-xs text-muted-foreground mt-0.5">{props.subtitle}</p>
            </Show>
          </div>
        </div>
      </Show>

      <Show
        when={calculatedTotal() > 0}
        fallback={
          <div class="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted/40 border border-border/50 text-muted-foreground/60 mb-2">
              <svg class="h-5 w-5 stroke-[1.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
              </svg>
            </div>
            <p class="text-xs font-semibold text-foreground/80">Kayıt Bulunamadı</p>
            <p class="text-[11px] text-muted-foreground mt-0.5">Analiz için henüz yeterli veri eklenmedi</p>
          </div>
        }
      >
        <div class="flex flex-col justify-between gap-4 py-1">
          {/* Total Stat Highlight */}
          <div class="flex items-baseline gap-2">
            <span class="font-mono text-3xl font-bold tracking-tight text-foreground">
              {props.valueText ?? calculatedTotal()}
            </span>
            <Show when={props.subtext}>
              <span class="text-xs font-medium text-muted-foreground">{props.subtext}</span>
            </Show>
          </div>

          {/* Multi-Segmented Progress Gauge Bar */}
          <div class="flex h-3.5 w-full overflow-hidden rounded-full bg-muted/60 dark:bg-muted/40 p-0.5 border border-border/40">
            <For each={props.segments}>
              {(segment) => {
                const pct = () => (calculatedTotal() > 0 ? (segment.value / calculatedTotal()) * 100 : 0);
                return (
                  <Show when={pct() > 0}>
                    <div
                      class={cn("h-full rounded-full transition-all duration-500 ease-out", segment.colorClass)}
                      style={{ width: `${pct()}%` }}
                      title={`${segment.label}: ${segment.value} (${Math.round(pct())}%)`}
                    />
                  </Show>
                );
              }}
            </For>
          </div>

          {/* Legend Grid */}
          <div class="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-2">
            <For each={props.segments}>
              {(segment) => (
                <div class="flex items-center justify-between rounded-xl border border-border/40 bg-muted/30 px-3 py-2 text-xs">
                  <div class="flex items-center gap-2 truncate">
                    <span class={cn("h-2.5 w-2.5 shrink-0 rounded-full", segment.colorClass)} />
                    <span class="truncate font-medium text-muted-foreground">{segment.label}</span>
                  </div>
                  <span class="font-mono font-semibold text-foreground ml-2">{segment.value}</span>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
};
