import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import { IconEdit, IconEraser, IconMove, IconZoomIn, IconZoomOut } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import {
  PAPER_CELL,
  PAPER_LINE,
  paintStroke,
  paintTip,
  type Point,
  type Stroke,
} from "@/lib/draw-stroke";
import { useT } from "@/stores/preferences-context";

const COLORS = ["#1f2937", "#dc2626", "#2563eb", "#16a34a", "#ca8a04"];
const WIDTHS = [2, 6, 14];
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;
const ZOOM_STEP = 1.25;
const OVERLAY_CARD = "absolute z-10 flex gap-1.5 rounded-lg border bg-card/90 p-1.5 shadow-xs backdrop-blur-xs";

// Imperative handle the room uses to push server-confirmed marks onto the
// canvas without re-rendering the whole component per stroke.
export type WhiteboardCanvasController = {
  /** Paint one server-confirmed stroke or segment (board-space coords). */
  applyStroke: (stroke: Stroke) => void;
  /** Replace the whole canvas (REST catch-up, resync). */
  loadStrokes: (strokes: Stroke[]) => void;
  /** Blank the live canvas (a clear / epoch bump — history is untouched). */
  reset: () => void;
};

/**
 * The collaborative whiteboard drawing surface. Unlike {@link DrawCanvas} it
 * never saves a File: each finished local stroke is emitted through
 * `props.onStroke` (board-space, device/zoom independent) for the room to send
 * over the socket, and server-confirmed strokes are pushed back in through the
 * controller. Strokes are held in a plain array and painted incrementally so a
 * busy board stays cheap; a full redraw only runs on pan / zoom / resize.
 */
export function WhiteboardCanvas(props: {
  disabled?: boolean;
  onStroke: (stroke: Stroke) => void;
  controllerRef?: (c: WhiteboardCanvasController) => void;
  class?: string;
}) {
  const t = useT();
  let canvas: HTMLCanvasElement | undefined;
  let wrap: HTMLDivElement | undefined;
  let current: Stroke | undefined;
  let panStart: { x: number; y: number; px: number; py: number } | undefined;
  // Every committed mark (local + remote), in draw order. Plain array, not a
  // signal: it can grow into the thousands and only pan/zoom/resize repaints it.
  const committed: Stroke[] = [];

  const [color, setColor] = createSignal(COLORS[0]);
  const [width, setWidth] = createSignal(WIDTHS[1]);
  const [erasing, setErasing] = createSignal(false);
  const [hand, setHand] = createSignal(false);
  const [override, setOverride] = createSignal<null | "pan" | "erase">(null);
  const [pan, setPan] = createSignal({ x: 0, y: 0 });
  const [panning, setPanning] = createSignal(false);
  const [zoom, setZoom] = createSignal(1);
  const [empty, setEmpty] = createSignal(true);

  const ratio = () => window.devicePixelRatio || 1;
  const context = () => canvas?.getContext("2d") ?? null;

  const activeTool = (): "pen" | "erase" | "pan" => {
    const o = override();
    if (o) return o;
    if (hand()) return "pan";
    if (erasing()) return "erase";
    return "pen";
  };

  const cursor = () => {
    const tool = activeTool();
    if (tool === "pan") return panning() ? "grabbing" : "grab";
    return "crosshair";
  };

  const redraw = () => {
    const c = context();
    if (!c || !canvas) return;
    const scale = ratio();
    c.setTransform(scale, 0, 0, scale, 0, 0);
    c.clearRect(0, 0, canvas.width / scale, canvas.height / scale);
    const p = pan();
    const z = zoom();
    c.setTransform(z * scale, 0, 0, z * scale, p.x * scale, p.y * scale);
    for (const stroke of committed) paintStroke(c, stroke);
    if (current) paintStroke(c, current);
  };

  const resize = () => {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const scale = ratio();
    canvas.width = Math.round(rect.width * scale);
    canvas.height = Math.round(rect.height * scale);
    redraw();
  };

  // Paint one just-committed stroke on top of the current transform, without a
  // full redraw. The transform matches redraw()'s so it lands in the same place.
  const paintOne = (stroke: Stroke) => {
    const c = context();
    if (!c || !canvas) return;
    const scale = ratio();
    const p = pan();
    const z = zoom();
    c.setTransform(z * scale, 0, 0, z * scale, p.x * scale, p.y * scale);
    paintStroke(c, stroke);
  };

  const controller: WhiteboardCanvasController = {
    applyStroke: (stroke) => {
      committed.push(stroke);
      setEmpty(false);
      paintOne(stroke);
    },
    loadStrokes: (strokes) => {
      committed.length = 0;
      committed.push(...strokes);
      setEmpty(committed.length === 0);
      redraw();
    },
    reset: () => {
      committed.length = 0;
      setEmpty(true);
      redraw();
    },
  };

  onMount(() => {
    resize();
    props.controllerRef?.(controller);
    const observer = new ResizeObserver(() => resize());
    if (wrap) observer.observe(wrap);
    onCleanup(() => observer.disconnect());
  });

  const pointAt = (e: PointerEvent): Point => {
    const rect = canvas!.getBoundingClientRect();
    const p = pan();
    const z = zoom();
    return { x: (e.clientX - rect.left - p.x) / z, y: (e.clientY - rect.top - p.y) / z };
  };

  const zoomBy = (factor: number) => {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const p = pan();
    const z0 = zoom();
    const z1 = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z0 * factor));
    if (z1 === z0) return;
    const wx = (cx - p.x) / z0;
    const wy = (cy - p.y) / z0;
    setZoom(z1);
    setPan({ x: cx - wx * z1, y: cy - wy * z1 });
    redraw();
  };

  const resetZoom = () => zoomBy(1 / zoom());

  const drawTip = (stroke: Stroke) => {
    const c = context();
    if (c) paintTip(c, stroke);
  };

  const startStroke = (e: PointerEvent) => {
    if (props.disabled && !(e.button === 1 || hand())) return;
    e.preventDefault();
    canvas?.setPointerCapture(e.pointerId);
    if (e.button === 1 || (hand() && e.button !== 2)) {
      if (e.button === 1) setOverride("pan");
      const p = pan();
      panStart = { x: e.clientX, y: e.clientY, px: p.x, py: p.y };
      setPanning(true);
      return;
    }
    if (props.disabled) return;
    const eraseNow = erasing() || e.button === 2;
    if (e.button === 2) setOverride("erase");
    current = {
      color: color(),
      width: eraseNow ? width() * 2.5 : width(),
      erase: eraseNow,
      points: [pointAt(e)],
    };
    drawTip(current);
  };

  const extendStroke = (e: PointerEvent) => {
    if (panStart) {
      setPan({ x: panStart.px + (e.clientX - panStart.x), y: panStart.py + (e.clientY - panStart.y) });
      redraw();
      return;
    }
    if (!current) return;
    current.points.push(pointAt(e));
    drawTip(current);
  };

  const endStroke = () => {
    setOverride(null);
    if (panStart) {
      panStart = undefined;
      setPanning(false);
      return;
    }
    const done = current;
    current = undefined;
    if (!done || done.points.length === 0) return;
    committed.push(done);
    setEmpty(false);
    redraw(); // swap the live polyline for its smoothed replay
    props.onStroke(done);
  };

  const toolClass = (active: boolean) =>
    cn(
      "flex h-11 w-11 items-center justify-center rounded-lg border transition-colors",
      active
        ? "border-primary bg-primary text-primary-foreground shadow-xs"
        : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
    );

  const paperStyle = () => {
    const cell = PAPER_CELL * zoom();
    const p = pan();
    return {
      "background-image": `linear-gradient(to right, ${PAPER_LINE} 1px, transparent 1px), linear-gradient(to bottom, ${PAPER_LINE} 1px, transparent 1px)`,
      "background-size": `${cell}px ${cell}px`,
      "background-position": `${p.x}px ${p.y}px`,
    };
  };

  return (
    <div class={cn("space-y-3", props.class)}>
      <div
        ref={wrap}
        class="relative h-104 overflow-hidden rounded-lg border bg-white shadow-inner sm:h-[70vh]"
        style={paperStyle()}
      >
        <canvas
          ref={canvas}
          class="h-full w-full touch-none"
          style={{ cursor: cursor() }}
          onMouseDown={(e) => {
            if (e.button === 1) e.preventDefault();
          }}
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={startStroke}
          onPointerMove={extendStroke}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onWheel={(e) => {
            e.preventDefault();
            zoomBy(e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP);
          }}
        />
        <Show when={empty() && !current}>
          <p class="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            {t("whiteboard.canvasHint")}
          </p>
        </Show>

        {/* Top-left island — tools */}
        <div class={cn(OVERLAY_CARD, "left-2 top-2")}>
          <button
            type="button"
            class={toolClass(activeTool() === "pen")}
            title={t("draw.pen")}
            onClick={() => {
              setErasing(false);
              setHand(false);
            }}
          >
            <IconEdit class="h-5 w-5" />
            <span class="sr-only">{t("draw.pen")}</span>
          </button>
          <button
            type="button"
            class={toolClass(activeTool() === "erase")}
            title={t("draw.eraser")}
            onClick={() => {
              setErasing(true);
              setHand(false);
            }}
          >
            <IconEraser class="h-5 w-5" />
            <span class="sr-only">{t("draw.eraser")}</span>
          </button>
          <button
            type="button"
            class={toolClass(activeTool() === "pan")}
            title={t("draw.pan")}
            onClick={() => setHand(true)}
          >
            <IconMove class="h-5 w-5" />
            <span class="sr-only">{t("draw.pan")}</span>
          </button>
        </div>

        {/* Top-middle island — colours */}
        <div
          class={cn(OVERLAY_CARD, "left-1/2 top-2 -translate-x-1/2 flex-wrap items-center")}
          role="group"
          aria-label={t("draw.color")}
        >
          <For each={COLORS}>
            {(swatch) => (
              <button
                type="button"
                title={t("draw.color")}
                class={cn(
                  "h-9 w-9 sm:h-11 sm:w-11 rounded-lg border-2 transition-transform",
                  color() === swatch && activeTool() === "pen"
                    ? "border-foreground scale-105"
                    : "border-border/60 hover:scale-105",
                )}
                style={{ "background-color": swatch }}
                onClick={() => {
                  setColor(swatch);
                  setErasing(false);
                  setHand(false);
                }}
              >
                <span class="sr-only">{swatch}</span>
              </button>
            )}
          </For>
        </div>

        {/* Top-right island — width */}
        <div class={cn(OVERLAY_CARD, "right-2 top-2")} role="group" aria-label={t("draw.width")}>
          <For each={WIDTHS}>
            {(size) => (
              <button
                type="button"
                title={t("draw.width")}
                class={toolClass(width() === size)}
                onClick={() => setWidth(size)}
              >
                <span class="rounded-full bg-current" style={{ width: `${size + 2}px`, height: `${size + 2}px` }} />
                <span class="sr-only">{size}</span>
              </button>
            )}
          </For>
        </div>

        {/* Bottom-right zoom */}
        <div class="absolute bottom-2 right-2 z-10 flex flex-col divide-y divide-border overflow-hidden rounded-lg border bg-card/90 shadow-xs backdrop-blur-xs">
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={t("draw.zoomIn")}
            onClick={() => zoomBy(ZOOM_STEP)}
          >
            <IconZoomIn class="h-5 w-5" />
            <span class="sr-only">{t("draw.zoomIn")}</span>
          </button>
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center font-mono text-xs tabular-nums text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={t("draw.resetZoom")}
            onClick={resetZoom}
          >
            {Math.round(zoom() * 100)}%
          </button>
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={t("draw.zoomOut")}
            onClick={() => zoomBy(1 / ZOOM_STEP)}
          >
            <IconZoomOut class="h-5 w-5" />
            <span class="sr-only">{t("draw.zoomOut")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
