import { For, Show, createMemo, type Component } from "solid-js";
import { cn } from "@/lib/cn";
import { useT } from "@/stores/preferences-context";

export type ChartLineItem = {
  id: string;
  label: string;
  value: number;
  formattedValue?: string;
  caption?: string;
};

export type ChartLineProps = {
  title?: string;
  subtitle?: string;
  items: ChartLineItem[];
  maxScale?: number;
  class?: string;
};

const VIEW_WIDTH = 720;
const VIEW_HEIGHT = 240;
const PADDING = { top: 18, right: 18, bottom: 34, left: 38 };
const Y_TICKS = [0, 25, 50, 75, 100];
const TOOLTIP_WIDTH = 190;
const TOOLTIP_HEIGHT = 62;

export const ChartLine: Component<ChartLineProps> = (props) => {
  const t = useT();
  const maxValue = () => props.maxScale != null && props.maxScale > 0
    ? props.maxScale
    : Math.max(...props.items.map((item) => item.value), 1);
  const plotWidth = VIEW_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = VIEW_HEIGHT - PADDING.top - PADDING.bottom;
  const pointFor = (item: ChartLineItem, index: number) => {
    const x = props.items.length === 1
      ? PADDING.left + plotWidth / 2
      : PADDING.left + (index / (props.items.length - 1)) * plotWidth;
    const y = PADDING.top + (1 - Math.min(1, Math.max(0, item.value / maxValue()))) * plotHeight;
    return { x, y };
  };
  const points = createMemo(() => props.items.map((item, index) => {
    const point = pointFor(item, index);
    return `${point.x},${point.y}`;
  }).join(" "));
  const areaPoints = createMemo(() => {
    if (props.items.length < 2) return "";
    const baseline = PADDING.top + plotHeight;
    return `${PADDING.left},${baseline} ${points()} ${PADDING.left + plotWidth},${baseline}`;
  });
  const summary = createMemo(() => {
    if (props.items.length === 0) return null;
    const values = props.items.map((item) => item.value);
    return {
      latest: props.items[props.items.length - 1],
      minimum: Math.min(...values),
      maximum: Math.max(...values),
      average: values.reduce((sum, value) => sum + value, 0) / values.length,
    };
  });
  const xTickIndexes = createMemo(() => {
    if (props.items.length <= 1) return [0];
    const step = Math.max(1, Math.ceil((props.items.length - 1) / 5));
    const indexes = Array.from({ length: props.items.length }, (_, index) => index)
      .filter((index) => index % step === 0);
    if (indexes[indexes.length - 1] !== props.items.length - 1) indexes.push(props.items.length - 1);
    return indexes;
  });
  const averageY = () => PADDING.top + (1 - Math.min(1, summary()!.average / maxValue())) * plotHeight;

  return (
    <div class={cn("flex flex-col gap-4 rounded-xl border border-border-line bg-surface-base p-4", props.class)}>
      <Show when={props.title}>
        <div class="border-b border-border-hairline pb-3">
          <h3 class="text-sm font-semibold tracking-tight text-foreground">{props.title}</h3>
          <Show when={props.subtitle}>
            <p class="mt-0.5 text-xs text-muted-foreground">{props.subtitle}</p>
          </Show>
        </div>
      </Show>

      <Show
        when={summary()}
        fallback={
          <div class="px-4 py-8 text-center">
            <p class="text-xs font-semibold text-foreground/80">{t("dashboard.chartEmpty")}</p>
            <p class="mt-0.5 text-[11px] text-muted-foreground">{t("dashboard.chartEmptyHint")}</p>
          </div>
        }
      >
        {(stats) => (
          <div class="space-y-3">
            <dl class="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div class="rounded-lg bg-surface-overlay px-2.5 py-2">
                <dt class="text-[10px] text-muted-foreground">{t("dashboard.chartExamCount")}</dt>
                <dd class="mt-0.5 font-mono text-sm font-semibold tabular-nums">{props.items.length}</dd>
              </div>
              <div class="rounded-lg bg-surface-overlay px-2.5 py-2">
                <dt class="text-[10px] text-muted-foreground">{t("dashboard.chartLatest")}</dt>
                <dd class="mt-0.5 font-mono text-sm font-semibold tabular-nums">{stats().latest.formattedValue ?? stats().latest.value}</dd>
              </div>
              <div class="rounded-lg bg-surface-overlay px-2.5 py-2">
                <dt class="text-[10px] text-muted-foreground">{t("dashboard.chartAverage")}</dt>
                <dd class="mt-0.5 font-mono text-sm font-semibold tabular-nums">{stats().average.toFixed(1)}</dd>
              </div>
              <div class="rounded-lg bg-surface-overlay px-2.5 py-2">
                <dt class="text-[10px] text-muted-foreground">{t("dashboard.chartRange")}</dt>
                <dd class="mt-0.5 font-mono text-sm font-semibold tabular-nums">{stats().minimum.toFixed(1)}–{stats().maximum.toFixed(1)}</dd>
              </div>
            </dl>

            <div class="overflow-x-auto pb-1">
              <svg
                class="h-60 min-w-[640px] w-full"
                viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
                role="img"
                aria-label={props.items.map((item) => `${item.label}${item.caption ? ` (${item.caption})` : ""}: ${item.formattedValue ?? item.value}`).join(", ")}
              >
                <For each={Y_TICKS}>
                  {(tick) => {
                    const y = () => PADDING.top + (1 - tick / 100) * plotHeight;
                    return (
                      <g>
                        <line x1={PADDING.left} x2={PADDING.left + plotWidth} y1={y()} y2={y()} class="stroke-border/70" stroke-width="1" />
                        <text x={PADDING.left - 8} y={y() + 3} text-anchor="end" class="fill-muted-foreground text-[9px]">{tick}</text>
                      </g>
                    );
                  }}
                </For>

                <Show when={props.items.length > 1}>
                  <polygon points={areaPoints()} class="fill-primary opacity-10" />
                  <line
                    x1={PADDING.left}
                    x2={PADDING.left + plotWidth}
                    y1={averageY()}
                    y2={averageY()}
                    class="stroke-muted-foreground"
                    stroke-width="1"
                    stroke-dasharray="4 4"
                  />
                  <text x={PADDING.left + 5} y={averageY() - 5} class="fill-muted-foreground text-[9px]">
                    {t("dashboard.chartAverage")}: {stats().average.toFixed(1)}
                  </text>
                  <polyline points={points()} fill="none" class="stroke-primary" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                </Show>

                <For each={props.items}>
                  {(item, index) => {
                    const point = () => pointFor(item, index());
                    const tooltipX = () => Math.min(
                      VIEW_WIDTH - PADDING.right - TOOLTIP_WIDTH,
                      Math.max(PADDING.left, point().x - TOOLTIP_WIDTH / 2),
                    );
                    const tooltipY = () => {
                      const preferred = point().y - TOOLTIP_HEIGHT - 12;
                      return preferred >= PADDING.top
                        ? preferred
                        : Math.min(point().y + 12, VIEW_HEIGHT - PADDING.bottom - TOOLTIP_HEIGHT);
                    };
                    const detail = () => `${item.label}${item.caption ? `, ${item.caption}` : ""}: ${item.formattedValue ?? item.value}`;
                    return (
                      <g class="group outline-none" tabindex="0" aria-label={detail()}>
                        <circle cx={point().x} cy={point().y} r="9" class="fill-transparent" />
                        <circle
                          cx={point().x}
                          cy={point().y}
                          r="4"
                          class="fill-primary stroke-card transition-[r] group-hover:r-[6px] group-focus:r-[6px]"
                          stroke-width="2"
                        />
                        <foreignObject
                          x={tooltipX()}
                          y={tooltipY()}
                          width={TOOLTIP_WIDTH}
                          height={TOOLTIP_HEIGHT}
                          class="pointer-events-none opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus:opacity-100"
                          data-chart-tooltip
                        >
                          <div class="h-full rounded-md border border-border bg-popover px-3 py-2 text-popover-foreground shadow-lg">
                            <p class="truncate text-[11px] font-semibold" title={item.label}>{item.label}</p>
                            <div class="mt-1 flex items-end justify-between gap-3">
                              <span class="truncate text-[10px] text-muted-foreground">{item.caption}</span>
                              <span class="font-mono text-base font-bold leading-none tabular-nums">{item.formattedValue ?? item.value}</span>
                            </div>
                          </div>
                        </foreignObject>
                      </g>
                    );
                  }}
                </For>

                <For each={xTickIndexes()}>
                  {(index) => {
                    const point = () => pointFor(props.items[index], index);
                    return (
                      <text
                        x={point().x}
                        y={VIEW_HEIGHT - 10}
                        text-anchor={index === 0 ? "start" : index === props.items.length - 1 ? "end" : "middle"}
                        class="fill-muted-foreground text-[9px]"
                      >
                        {props.items[index].caption ?? props.items[index].label}
                      </text>
                    );
                  }}
                </For>
              </svg>
            </div>
            <p class="truncate text-[11px] text-muted-foreground" title={stats().latest.label}>
              {t("dashboard.chartLatestExam")}: <span class="font-medium text-foreground/80">{stats().latest.label}</span>
              <Show when={stats().latest.caption}> · {stats().latest.caption}</Show>
            </p>
          </div>
        )}
      </Show>
    </div>
  );
};
