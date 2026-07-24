import { For, Show, createSignal, type Component } from "solid-js";
import { cn } from "@/lib/cn";

export type ChartAreaTrendItem = {
  label: string;
  value: number;
  formattedValue?: string;
};

export type ChartAreaTrendProps = {
  title: string;
  subtitle?: string;
  items: ChartAreaTrendItem[];
  class?: string;
  minScale?: number;
  maxScale?: number;
  unit?: string;
};

export const ChartAreaTrend: Component<ChartAreaTrendProps> = (props) => {
  const [hoverIndex, setHoverIndex] = createSignal<number | null>(null);

  const values = () => props.items.map((i) => i.value);
  const minVal = () => props.minScale ?? Math.min(0, ...values());
  const maxVal = () => props.maxScale ?? Math.max(1, ...values());

  const width = 360;
  const height = 120;
  const paddingX = 20;
  const paddingTop = 15;
  const paddingBottom = 25;

  const points = () => {
    const list = props.items;
    if (list.length === 0) return [];
    const min = minVal();
    const max = maxVal();
    const range = max - min || 1;
    const stepX = (width - paddingX * 2) / Math.max(1, list.length - 1);
    const usableH = height - paddingTop - paddingBottom;

    return list.map((item, i) => {
      const x = paddingX + i * stepX;
      const normalized = (item.value - min) / range;
      const y = height - paddingBottom - normalized * usableH;
      return { x, y, item, index: i };
    });
  };

  const linePath = () => {
    const pts = points();
    if (pts.length === 0) return "";
    return pts.reduce((acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), "");
  };

  const areaPath = () => {
    const pts = points();
    if (pts.length === 0) return "";
    const first = pts[0];
    const last = pts[pts.length - 1];
    const bottomY = height - paddingBottom;
    return `${linePath()} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  };

  return (
    <div class={cn("flex flex-col space-y-3 rounded-2xl border border-border/60 bg-card p-4 shadow-xs dark:border-white/8", props.class)}>
      <div class="flex items-start justify-between gap-2">
        <div class="space-y-0.5 min-w-0">
          <h3 class="truncate text-sm font-semibold tracking-tight text-foreground">{props.title}</h3>
          <Show when={props.subtitle}>
            <p class="truncate text-xs text-muted-foreground">{props.subtitle}</p>
          </Show>
        </div>
        <Show when={props.items.length > 0}>
          <div class="mono tabular-nums text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
            {hoverIndex() !== null
              ? (props.items[hoverIndex()!]?.formattedValue ?? `${props.items[hoverIndex()!]?.value}${props.unit ?? ""}`)
              : (props.items[props.items.length - 1]?.formattedValue ?? `${props.items[props.items.length - 1]?.value}${props.unit ?? ""}`)}
          </div>
        </Show>
      </div>

      <Show
        when={props.items.length > 0}
        fallback={
          <div class="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted/40 border border-border/50 text-muted-foreground/60 mb-2">
              <svg class="h-5 w-5 stroke-[1.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p class="text-xs font-semibold text-foreground/80">Kayıt Bulunamadı</p>
            <p class="text-[11px] text-muted-foreground mt-0.5">Gösterilecek henüz veri eklenmedi</p>
          </div>
        }
      >
        <div class="relative w-full overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} class="w-full h-32 overflow-visible">
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="hsl(var(--primary))" stop-opacity="0.35" />
                <stop offset="100%" stop-color="hsl(var(--primary))" stop-opacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            <line x1={paddingX} y1={paddingTop} x2={width - paddingX} y2={paddingTop} stroke="currentColor" stroke-opacity="0.08" stroke-dasharray="3 3" />
            <line x1={paddingX} y1={(paddingTop + height - paddingBottom) / 2} x2={width - paddingX} y2={(paddingTop + height - paddingBottom) / 2} stroke="currentColor" stroke-opacity="0.08" stroke-dasharray="3 3" />
            <line x1={paddingX} y1={height - paddingBottom} x2={width - paddingX} y2={height - paddingBottom} stroke="currentColor" stroke-opacity="0.12" />

            {/* Hover Vertical Guideline */}
            <Show when={hoverIndex() !== null && points()[hoverIndex()!]}>
              {(p) => (
                <line
                  x1={p().x}
                  y1={paddingTop}
                  x2={p().x}
                  y2={height - paddingBottom}
                  stroke="hsl(var(--primary))"
                  stroke-opacity="0.3"
                  stroke-dasharray="3 3"
                  stroke-width="1.5"
                />
              )}
            </Show>

            {/* Filled Area */}
            <path d={areaPath()} fill="url(#areaGradient)" />

            {/* Trend Line */}
            <path d={linePath()} fill="none" stroke="hsl(var(--primary))" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />

            {/* Data Points */}
            <For each={points()}>
              {(p) => (
                <g class="cursor-pointer group" onMouseEnter={() => setHoverIndex(p.index)} onMouseLeave={() => setHoverIndex(null)}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={hoverIndex() === p.index ? "5.5" : "3.5"}
                    class={cn(
                      "transition-all duration-200 fill-background stroke-primary stroke-[2.5]",
                      hoverIndex() === p.index && "fill-primary stroke-background shadow-lg stroke-3",
                    )}
                  />
                  <text
                    x={p.x}
                    y={height - 8}
                    text-anchor="middle"
                    class={cn(
                      "text-[10px] transition-colors font-medium",
                      hoverIndex() === p.index ? "fill-primary font-bold" : "fill-muted-foreground"
                    )}
                  >
                    {p.item.label}
                  </text>
                </g>
              )}
            </For>

            {/* Floating Active Hover Tooltip */}
            <Show when={hoverIndex() !== null && points()[hoverIndex()!]}>
              {(p) => {
                const text = p().item.formattedValue ?? `${p().item.value}${props.unit ?? ""}`;
                const rectW = 64;
                const rectH = 20;
                const tooltipX = Math.max(paddingX, Math.min(width - paddingX - rectW, p().x - rectW / 2));
                const tooltipY = Math.max(2, p().y - 26);
                return (
                  <g class="pointer-events-none transition-all duration-150">
                    <circle
                      cx={p().x}
                      cy={p().y}
                      r="8.5"
                      class="fill-primary/20 stroke-primary/40 stroke-1"
                    />
                    <rect
                      x={tooltipX}
                      y={tooltipY}
                      width={rectW}
                      height={rectH}
                      rx="5"
                      class="fill-card stroke-primary/40 stroke shadow-md dark:fill-zinc-900"
                    />
                    <text
                      x={tooltipX + rectW / 2}
                      y={tooltipY + 13.5}
                      text-anchor="middle"
                      class="fill-foreground font-semibold text-[10px] mono tabular-nums"
                    >
                      {text}
                    </text>
                  </g>
                );
              }}
            </Show>
          </svg>
        </div>
      </Show>
    </div>
  );
};
