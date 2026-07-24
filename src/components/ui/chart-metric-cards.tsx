import { For, Show, type Component } from "solid-js";
import { cn } from "@/lib/cn";

export type ChartMetricCardItem = {
  id: string;
  label: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  subtext?: string;
  accentColor?: string;
};

export type ChartMetricCardsProps = {
  title: string;
  subtitle?: string;
  metrics: ChartMetricCardItem[];
  class?: string;
};

export const ChartMetricCards: Component<ChartMetricCardsProps> = (props) => {
  return (
    <div class={cn("flex flex-col space-y-3 rounded-2xl border border-border/60 bg-card p-4 shadow-xs dark:border-white/8", props.class)}>
      <div class="space-y-0.5 min-w-0">
        <h3 class="truncate text-sm font-semibold tracking-tight text-foreground">{props.title}</h3>
        <Show when={props.subtitle}>
          <p class="truncate text-xs text-muted-foreground">{props.subtitle}</p>
        </Show>
      </div>

      <div class="grid grid-cols-2 gap-2.5">
        <For each={props.metrics}>
          {(m) => (
            <div class="flex flex-col justify-between rounded-xl border border-border/50 bg-muted/20 p-3 transition-colors hover:bg-muted/40">
              <div class="flex items-center justify-between gap-1">
                <span class="truncate text-xs font-medium text-muted-foreground">{m.label}</span>
                <Show when={m.change}>
                  <span
                    class={cn(
                      "inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold mono tabular-nums",
                      m.isPositive !== false
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
                    )}
                  >
                    <span
                      class={cn(
                        "h-1.5 w-1.5 rounded-full shrink-0",
                        m.isPositive !== false ? "bg-emerald-500" : "bg-rose-500"
                      )}
                      aria-hidden="true"
                    />
                    {m.change}
                  </span>
                </Show>
              </div>

              <div class="mt-2 flex items-baseline justify-between">
                <span class="mono tabular-nums text-xl font-bold tracking-tight text-foreground">
                  {m.value}
                </span>
                <Show when={m.subtext}>
                  <span class="text-[10px] text-muted-foreground font-medium">{m.subtext}</span>
                </Show>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};
