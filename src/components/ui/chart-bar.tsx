import { For, Show, createSignal, type Component } from "solid-js";
import { cn } from "@/lib/cn";
import { useT } from "@/stores/preferences-context";

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
  const t = useT();

  const maxValue = () => {
    if (props.maxScale != null && props.maxScale > 0) return props.maxScale;
    const itemMax = Math.max(...props.items.map((i) => i.value), 1);
    return itemMax;
  };

  return (
    <div class={cn("flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-sm", props.class)}>
      <Show when={props.title}>
        <div class="border-b border-border pb-3">
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
          <div class="px-4 py-8 text-center">
            <p class="text-xs font-semibold text-foreground/80">{t("dashboard.chartEmpty")}</p>
            <p class="text-[11px] text-muted-foreground mt-0.5">{t("dashboard.chartEmptyHint")}</p>
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
