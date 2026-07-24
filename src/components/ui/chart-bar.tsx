import { For, Show, createSignal, type Component } from "solid-js";
import { cn } from "@/lib/cn";

export type ChartBarItem = {
  id: string;
  label: string;
  value: number;
  max?: number;
  formattedValue?: string;
  colorClass?: string;
};

export type ChartBarProps = {
  title?: string;
  subtitle?: string;
  items: ChartBarItem[];
  maxScale?: number;
  class?: string;
};

export const ChartBar: Component<ChartBarProps> = (props) => {
  const [hoveredId, setHoveredId] = createSignal<string | null>(null);

  const maxValue = () => {
    if (props.maxScale != null && props.maxScale > 0) return props.maxScale;
    const itemMax = Math.max(...props.items.map((i) => i.value), 1);
    return itemMax;
  };

  return (
    <div class={cn("flex flex-col gap-3.5 rounded-3xl border border-border/60 bg-card/60 p-4 sm:p-5 dark:border-white/8 dark:bg-card/40 shadow-xs backdrop-blur-xs", props.class)}>
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
        when={props.items.length > 0}
        fallback={
          <div class="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted/40 border border-border/50 text-muted-foreground/60 mb-2">
              <svg class="h-5 w-5 stroke-[1.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <p class="text-xs font-semibold text-foreground/80">Kayıt Bulunamadı</p>
            <p class="text-[11px] text-muted-foreground mt-0.5">Grafik için henüz yeterli veri bulunmuyor</p>
          </div>
        }
      >
        <div class="space-y-3 pt-1">
          <For each={props.items}>
            {(item) => {
              const pct = () => Math.min(100, Math.max(0, (item.value / maxValue()) * 100));
              const isHovered = () => hoveredId() === item.id;

              return (
                <div
                  class="group relative space-y-1.5"
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-medium text-foreground/90 truncate max-w-[70%]">
                      {item.label}
                    </span>
                    <span class="font-mono text-xs font-semibold tabular-nums text-foreground">
                      {item.formattedValue ?? item.value}
                    </span>
                  </div>

                  <div class="relative h-2.5 w-full overflow-hidden rounded-full bg-muted/60 dark:bg-muted/40">
                    <div
                      class={cn(
                        "h-full rounded-full transition-all duration-500 ease-out",
                        item.colorClass ?? "bg-primary",
                        isHovered() && "brightness-110 shadow-xs",
                      )}
                      style={{ width: `${pct()}%` }}
                    />
                  </div>

                  <Show when={isHovered()}>
                    <div class="absolute -top-7 right-0 z-20 rounded-lg bg-popover px-2.5 py-1 text-[11px] font-medium text-popover-foreground shadow-md border border-border">
                      {item.label}: {item.formattedValue ?? item.value} ({Math.round(pct())}%)
                    </div>
                  </Show>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
};
