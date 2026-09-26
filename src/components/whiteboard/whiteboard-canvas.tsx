import { For, Show, createSignal, onCleanup, onMount, type JSX } from "solid-js";
import { FullscreenToggle } from "@/components/ui/fullscreen-toggle";
import {
  IconArrowRight,
  IconCircle,
  IconDiamond,
  IconEdit,
  IconEraser,
  IconGrid,
  IconHand,
  IconLineSegment,
  IconSquare,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { FULLSCREEN_ROOT_CLASS, createFullscreen } from "@/lib/fullscreen";
import { constrainEnd, shapeStrokes, type ShapeKind, type Sloppiness } from "@/lib/board-shapes";
import { strokeHit } from "@/lib/board-hit";
import type { BoardStroke } from "@/lib/board-stroke-codec";
import {
  PAPER_CELL,
  PAPER_LINE,
  paintStroke,
  type Point,
  type Stroke,
  type StrokeDash,
} from "@/lib/draw-stroke";
import type { MessageKey } from "@/i18n/messages";
import { useT } from "@/stores/preferences-context";

// Layout and vocabulary follow Excalidraw: a tool island top-centre with a
// single-letter shortcut on every tool, a style island on the left while a
// drawing tool is active, zoom bottom-left, the hand tool on Space / scroll.

type Tool = "hand" | "pen" | ShapeKind | "eraser";

const TOOLS: { tool: Tool; key: string; label: MessageKey; icon: (p: { class?: string }) => JSX.Element }[] = [
  { tool: "hand", key: "H", label: "draw.pan", icon: IconHand },
  { tool: "pen", key: "P", label: "draw.pen", icon: IconEdit },
  { tool: "rectangle", key: "R", label: "draw.rectangle", icon: IconSquare },
  { tool: "diamond", key: "D", label: "draw.diamond", icon: IconDiamond },
  { tool: "ellipse", key: "O", label: "draw.ellipse", icon: IconCircle },
  { tool: "arrow", key: "A", label: "draw.arrow", icon: IconArrowRight },
  { tool: "line", key: "L", label: "draw.line", icon: IconLineSegment },
  { tool: "eraser", key: "E", label: "draw.eraser", icon: IconEraser },
];
const TOOL_BY_KEY = new Map(TOOLS.map((entry) => [entry.key.toLowerCase(), entry.tool]));
const SHAPES = new Set<Tool>(["rectangle", "diamond", "ellipse", "arrow", "line"]);
const isShape = (tool: Tool): tool is ShapeKind => SHAPES.has(tool);

// Excalidraw's default stroke palette.
const COLORS = ["#1e1e1e", "#e03131", "#2f9e44", "#1971c2", "#f08c00"];
/** Spoken name of each swatch — a hex code is no accessible name. */
const COLOR_NAMES: Record<string, MessageKey> = {
  "#1e1e1e": "draw.colorName.black",
  "#e03131": "draw.colorName.red",
  "#2f9e44": "draw.colorName.green",
  "#1971c2": "draw.colorName.blue",
  "#f08c00": "draw.colorName.orange",
};
const WIDTHS: { size: number; label: MessageKey }[] = [
  { size: 2, label: "draw.widthThin" },
  { size: 4, label: "draw.widthBold" },
  { size: 8, label: "draw.widthExtraBold" },
];
const DASHES: { dash: StrokeDash | undefined; label: MessageKey; pattern?: string }[] = [
  { dash: undefined, label: "draw.styleSolid" },
  { dash: "dashed", label: "draw.styleDashed", pattern: "4 3" },
  { dash: "dotted", label: "draw.styleDotted", pattern: "0.5 3" },
];
const SLOPPINESS: { slop: Sloppiness; label: MessageKey; path: string }[] = [
  { slop: 0, label: "draw.slopArchitect", path: "M2 12 C6 12 8 6 12 6 S18 12 22 12" },
  { slop: 1, label: "draw.slopArtist", path: "M2 13 C5 11 7 6 10 7 S13 14 16 12 S20 7 22 9" },
  { slop: 2, label: "draw.slopCartoonist", path: "M2 13 C5 10 7 5 10 7 S13 15 16 12 S20 6 22 9 M3 11 C6 9 8 7 11 8 S14 13 17 11 S20 8 22 11" },
];
/** How far the eraser reaches, in screen px (divided by zoom for board-space). */
const ERASER_REACH = 6;
/** Opacity of strokes the eraser has touched but not yet removed. */
const ERASE_PENDING_ALPHA = 0.2;
const ERASER_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="8" cy="8" r="6" fill="white" stroke="black" stroke-width="1.2"/></svg>',
)}") 8 8, crosshair`;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;
const ZOOM_STEP = 1.25;
// Dark theme flips the ink the way Excalidraw does rather than re-colouring
// strokes: stored colours stay the same for everyone, only the view inverts.
const DARK_INK = "dark:[filter:invert(93%)_hue-rotate(180deg)]";
const ISLAND = "rounded-lg border border-border/70 bg-card shadow-[0_1px_4px_rgb(0_0_0/0.08)]";

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

// Imperative handle the room uses to push server-confirmed marks onto the
// canvas without re-rendering the whole component per stroke.
export type WhiteboardCanvasController = {
  /** Paint one server-confirmed stroke or segment (board-space coords). */
  applyStroke: (stroke: BoardStroke) => void;
  /** Replace the whole canvas (REST catch-up, resync). */
  loadStrokes: (strokes: BoardStroke[]) => void;
  /** Drop the strokes with these ids (an erase marker, local or remote). */
  removeStrokes: (ids: string[]) => void;
  /** Blank the live canvas (a clear / epoch bump — history is untouched). */
  reset: () => void;
};

/**
 * The collaborative whiteboard drawing surface. Unlike {@link DrawCanvas} it
 * never saves a File: each finished local stroke is emitted through
 * `props.onStroke` (board-space, device/zoom independent) for the room to send
 * over the socket, and server-confirmed strokes are pushed back in through the
 * controller. Shapes are baked into plain strokes (see lib/board-shapes), so
 * the wire and the history replay only ever see strokes. Committed strokes are
 * held in a plain array and painted incrementally; the mark being drawn lives
 * on a separate preview canvas so a shape can be re-drawn on every move.
 */
export function WhiteboardCanvas(props: {
  disabled?: boolean;
  /** A finished local stroke; its `id` is the sid it must travel under. */
  onStroke: (stroke: BoardStroke) => void;
  /** The eraser removed these strokes locally; the room logs the removal. */
  onErase: (ids: string[]) => void;
  /** Board-level controls docked top-right, beside the tool island. */
  topRight?: JSX.Element;
  /** Board-level controls docked top-left (the board menu). */
  topLeft?: JSX.Element;
  /** A status line under the tool island (locked, closed, an error). */
  banner?: string;
  bannerTone?: "info" | "error";
  /** Fill the parent edge to edge, the way Excalidraw owns the viewport. */
  fill?: boolean;
  controllerRef?: (c: WhiteboardCanvasController) => void;
  class?: string;
}) {
  const t = useT();
  let canvas: HTMLCanvasElement | undefined;
  let preview: HTMLCanvasElement | undefined;
  let wrap: HTMLDivElement | undefined;
  let root: HTMLDivElement | undefined;
  let current: BoardStroke | undefined;
  // Excalidraw's eraser: strokes swept over fade while the button is held and
  // are removed on release, whole — never cut into pieces.
  let erasing: { ids: Set<string>; trail: Point[] } | undefined;
  let shape: { kind: ShapeKind; start: Point; seed: number; strokes: Stroke[] } | undefined;
  // The ResizeObserver on `wrap` re-sizes the backing store on enter/exit and
  // redraw() repaints `committed`, so no stroke is lost.
  const fullscreen = createFullscreen(() => root);
  let panStart: { x: number; y: number; px: number; py: number } | undefined;
  // Every committed mark (local + remote), in draw order. Plain array, not a
  // signal: it can grow into the thousands and only pan/zoom/resize repaints it.
  const committed: BoardStroke[] = [];
  // Ids already erased, so a late segment of a removed stroke never reappears.
  const removed = new Set<string>();
  let idSeq = 0;
  const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${(idSeq += 1)}`;

  const [color, setColor] = createSignal(COLORS[0]);
  const [width, setWidth] = createSignal(WIDTHS[1].size);
  const [dash, setDash] = createSignal<StrokeDash | undefined>(undefined);
  const [slop, setSlop] = createSignal<Sloppiness>(1);
  // The board opens on the hand tool: it is a shared live canvas, so a stray
  // tap must not leave a mark for everyone — drawing starts once a tool is picked.
  const [tool, setTool] = createSignal<Tool>("hand");
  // A middle-drag pans and a right-drag erases for as long as the button is held.
  const [override, setOverride] = createSignal<null | "hand" | "eraser">(null);
  const [spaceHeld, setSpaceHeld] = createSignal(false);
  const [pan, setPan] = createSignal({ x: 0, y: 0 });
  const [panning, setPanning] = createSignal(false);
  const [zoom, setZoom] = createSignal(1);
  const [empty, setEmpty] = createSignal(true);
  const [grid, setGrid] = createSignal(false);
  // Phones have no room for the style island next to the canvas, so there it
  // opens on demand from the swatch button bottom-left.
  const [styleOpen, setStyleOpen] = createSignal(false);
  // Below this width the tool island no longer fits between the corner
  // controls, so it drops to a second row.
  const [wide, setWide] = createSignal(true);
  const hasCorners = () => Boolean(props.topLeft || props.topRight);
  const toolbarRow2 = () => hasCorners() && !wide() && !fullscreen.active();
  const showsStyle = () => activeTool() !== "hand" && activeTool() !== "eraser";

  const ratio = () => window.devicePixelRatio || 1;
  const context = () => canvas?.getContext("2d") ?? null;

  const activeTool = (): Tool => override() ?? (spaceHeld() ? "hand" : tool());

  const cursor = () => {
    const active = activeTool();
    if (active === "hand") return panning() ? "grabbing" : "grab";
    if (active === "eraser") return ERASER_CURSOR;
    return "crosshair";
  };

  const worldTransform = (c: CanvasRenderingContext2D) => {
    const scale = ratio();
    const p = pan();
    const z = zoom();
    c.setTransform(z * scale, 0, 0, z * scale, p.x * scale, p.y * scale);
  };

  const clearCanvas = (target: HTMLCanvasElement | undefined) => {
    const c = target?.getContext("2d");
    if (!c || !target) return null;
    const scale = ratio();
    c.setTransform(scale, 0, 0, scale, 0, 0);
    c.clearRect(0, 0, target.width / scale, target.height / scale);
    return c;
  };

  const redraw = () => {
    const c = clearCanvas(canvas);
    if (!c) return;
    worldTransform(c);
    const pending = erasing?.ids;
    for (const stroke of committed) {
      const fading = pending !== undefined && stroke.id !== undefined && pending.has(stroke.id);
      if (fading) c.globalAlpha = ERASE_PENDING_ALPHA;
      paintStroke(c, stroke);
      if (fading) c.globalAlpha = 1;
    }
  };

  /** Repaint the in-progress pen line or shape on the preview layer. */
  const paintPreview = (strokes: Stroke[]) => {
    const c = clearCanvas(preview);
    if (!c) return;
    worldTransform(c);
    for (const stroke of strokes) paintStroke(c, stroke);
  };

  const resize = () => {
    if (!canvas || !preview) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    setWide(rect.width >= 1000);
    const scale = ratio();
    for (const target of [canvas, preview]) {
      target.width = Math.round(rect.width * scale);
      target.height = Math.round(rect.height * scale);
    }
    redraw();
  };

  // Paint one just-committed stroke on top of the current transform, without a
  // full redraw. The transform matches redraw()'s so it lands in the same place.
  const paintOne = (stroke: BoardStroke) => {
    const c = context();
    if (!c) return;
    worldTransform(c);
    paintStroke(c, stroke);
  };

  const removeLocal = (ids: Iterable<string>) => {
    for (const id of ids) removed.add(id);
    const kept = committed.filter((stroke) => !(stroke.id && removed.has(stroke.id)));
    if (kept.length === committed.length) return;
    committed.length = 0;
    committed.push(...kept);
    setEmpty(committed.length === 0);
    redraw();
  };

  const controller: WhiteboardCanvasController = {
    applyStroke: (stroke) => {
      if (stroke.id && removed.has(stroke.id)) return;
      committed.push(stroke);
      setEmpty(false);
      paintOne(stroke);
    },
    loadStrokes: (strokes) => {
      removed.clear();
      committed.length = 0;
      committed.push(...strokes);
      setEmpty(committed.length === 0);
      redraw();
    },
    removeStrokes: (ids) => removeLocal(ids),
    reset: () => {
      removed.clear();
      committed.length = 0;
      setEmpty(true);
      redraw();
    },
  };

  const zoomAt = (cx: number, cy: number, factor: number) => {
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

  const zoomBy = (factor: number) => {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    zoomAt(rect.width / 2, rect.height / 2, factor);
  };

  const resetZoom = () => zoomBy(1 / zoom());

  const pickTool = (next: Tool) => {
    setTool(next);
    if (next === "hand") setStyleOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.defaultPrevented || isTypingTarget(e.target)) return;
    // A side panel or confirm dialog above the board owns the keyboard.
    if (e.target instanceof Element && e.target.closest("[role='dialog']")) return;
    if (e.code === "Space") {
      // A focused button keeps Space as its own activation key.
      if (e.target instanceof HTMLButtonElement) return;
      e.preventDefault();
      if (!e.repeat) setSpaceHeld(true);
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "=" || e.key === "+") zoomBy(ZOOM_STEP);
      else if (e.key === "-") zoomBy(1 / ZOOM_STEP);
      else if (e.key === "0") resetZoom();
      else return;
      e.preventDefault();
      return;
    }
    if (e.altKey || e.repeat) return;
    const next = TOOL_BY_KEY.get(e.key.toLowerCase());
    if (next) {
      e.preventDefault();
      pickTool(next);
    }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === "Space") setSpaceHeld(false);
  };
  const onBlur = () => setSpaceHeld(false);

  onMount(() => {
    resize();
    props.controllerRef?.(controller);
    const observer = new ResizeObserver(() => resize());
    if (wrap) observer.observe(wrap);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    onCleanup(() => {
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    });
  });

  const pointAt = (e: PointerEvent): Point => {
    const rect = canvas!.getBoundingClientRect();
    const p = pan();
    const z = zoom();
    return { x: (e.clientX - rect.left - p.x) / z, y: (e.clientY - rect.top - p.y) / z };
  };

  /** Mark every stroke the eraser's latest move touched; true when any is new. */
  const sweep = (a: Point, b: Point) => {
    if (!erasing) return false;
    const reach = ERASER_REACH / zoom();
    let hit = false;
    for (const stroke of committed) {
      if (!stroke.id || erasing.ids.has(stroke.id)) continue;
      if (strokeHit(stroke, a, b, reach)) {
        erasing.ids.add(stroke.id);
        hit = true;
      }
    }
    return hit;
  };

  /** A short fading grey trail behind the eraser, on the preview layer. */
  const paintTrail = (trail: Point[]) => {
    const c = clearCanvas(preview);
    if (!c) return;
    worldTransform(c);
    const tail = trail.slice(-12);
    paintStroke(c, { color: "rgba(120, 120, 120, 0.35)", width: 5 / zoom(), erase: false, points: tail });
  };

  const strokeStyle = () => ({ color: color(), width: width(), ...(dash() ? { dash: dash() } : {}) });

  const startStroke = (e: PointerEvent) => {
    const panNow = e.button === 1 || (activeTool() === "hand" && e.button !== 2);
    if (props.disabled && !panNow) return;
    e.preventDefault();
    canvas?.setPointerCapture(e.pointerId);
    if (panNow) {
      if (e.button === 1) setOverride("hand");
      const p = pan();
      panStart = { x: e.clientX, y: e.clientY, px: p.x, py: p.y };
      setPanning(true);
      return;
    }
    const point = pointAt(e);
    if (e.button === 2 || activeTool() === "eraser") {
      if (e.button === 2) setOverride("eraser");
      erasing = { ids: new Set(), trail: [point] };
      if (sweep(point, point)) redraw();
      return;
    }
    const active = activeTool();
    if (isShape(active)) {
      shape = { kind: active, start: point, seed: Math.floor(Math.random() * 2 ** 31), strokes: [] };
      return;
    }
    current = { ...strokeStyle(), erase: false, id: newId(), points: [point] };
    paintPreview([current]);
  };

  const extendStroke = (e: PointerEvent) => {
    if (panStart) {
      setPan({ x: panStart.px + (e.clientX - panStart.x), y: panStart.py + (e.clientY - panStart.y) });
      redraw();
      return;
    }
    if (shape) {
      const point = pointAt(e);
      const end = e.shiftKey ? constrainEnd(shape.kind, shape.start, point) : point;
      shape.strokes = shapeStrokes(shape.kind, shape.start, end, strokeStyle(), slop(), shape.seed);
      paintPreview(shape.strokes);
      return;
    }
    if (erasing) {
      const point = pointAt(e);
      const prev = erasing.trail[erasing.trail.length - 1];
      erasing.trail.push(point);
      if (sweep(prev, point)) redraw();
      paintTrail(erasing.trail);
      return;
    }
    if (!current) return;
    current.points.push(pointAt(e));
    paintPreview([current]);
  };

  const commit = (stroke: BoardStroke) => {
    committed.push(stroke);
    setEmpty(false);
    props.onStroke(stroke);
  };

  const endStroke = () => {
    setOverride(null);
    if (panStart) {
      panStart = undefined;
      setPanning(false);
      return;
    }
    clearCanvas(preview);
    if (erasing) {
      const ids = [...erasing.ids];
      erasing = undefined;
      if (ids.length === 0) return;
      removeLocal(ids);
      props.onErase(ids);
      return;
    }
    if (shape) {
      const strokes = shape.strokes;
      shape = undefined;
      for (const bare of strokes) {
        const stroke: BoardStroke = { ...bare, id: newId() };
        paintOne(stroke);
        commit(stroke);
      }
      return;
    }
    const done = current;
    current = undefined;
    if (!done || done.points.length === 0) return;
    paintOne(done);
    commit(done);
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : 1; // Firefox reports lines
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+wheel and trackpad pinch zoom toward the pointer.
      const rect = canvas!.getBoundingClientRect();
      const delta = Math.max(-50, Math.min(50, e.deltaY * unit));
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-delta * 0.01));
      return;
    }
    const horizontal = e.shiftKey && e.deltaX === 0;
    const dx = (horizontal ? e.deltaY : e.deltaX) * unit;
    const dy = (horizontal ? 0 : e.deltaY) * unit;
    setPan((p) => ({ x: p.x - dx, y: p.y - dy }));
    redraw();
  };

  const hint = () => {
    const active = activeTool();
    if (props.disabled) return active === "hand" ? t("whiteboard.panHint") : "";
    if (isShape(active)) return t("whiteboard.shapeHint");
    if (active === "eraser") return t("whiteboard.eraserHint");
    if (active === "hand" || active === "pen") return t("whiteboard.panHint");
    return "";
  };

  const paperStyle = () => {
    if (!grid()) return {};
    const cell = PAPER_CELL * zoom();
    const p = pan();
    return {
      "background-image": `linear-gradient(to right, ${PAPER_LINE} 1px, transparent 1px), linear-gradient(to bottom, ${PAPER_LINE} 1px, transparent 1px)`,
      "background-size": `${cell}px ${cell}px`,
      "background-position": `${p.x}px ${p.y}px`,
    };
  };

  const optionClass = (active: boolean) =>
    cn(
      "flex h-8 w-8 items-center justify-center rounded-md transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
      active ? "bg-primary/15 text-primary-text ring-1 ring-primary/40" : "bg-muted/60 text-foreground/80 hover:bg-muted",
    );

  const plainButton =
    "flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

  const Section = (sectionProps: { label: string; children: JSX.Element }) => (
    <div role="group" aria-label={sectionProps.label}>
      <p class="mb-1.5 text-[11px] font-medium text-muted-foreground">{sectionProps.label}</p>
      <div class="flex flex-wrap gap-1.5">{sectionProps.children}</div>
    </div>
  );

  return (
    <div ref={root} class={cn(props.class, fullscreen.active() && FULLSCREEN_ROOT_CLASS)}>
      <div
        ref={wrap}
        class={cn(
          "relative overflow-hidden bg-white dark:bg-[#121212]",
          props.fill ? "h-full" : "h-112 rounded-xl border sm:h-[72vh]",
          fullscreen.active() && "h-auto min-h-0 flex-1 sm:h-auto",
        )}
        style={paperStyle()}
      >
        <canvas
          ref={canvas}
          class={cn("h-full w-full touch-none", DARK_INK)}
          style={{ cursor: cursor() }}
          onMouseDown={(e) => {
            if (e.button === 1) e.preventDefault();
          }}
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={startStroke}
          onPointerMove={extendStroke}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onWheel={onWheel}
        />
        <canvas ref={preview} class={cn("pointer-events-none absolute inset-0 h-full w-full", DARK_INK)} aria-hidden="true" />
        <Show when={empty()}>
          <p class="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-400">
            {activeTool() === "hand" && !props.disabled ? t("whiteboard.canvasHintPickPen") : t("whiteboard.canvasHint")}
          </p>
        </Show>

        {/* Corner controls the host docks beside the tools. Hidden in full
            screen: their menus portal to <body>, which full screen covers. */}
        <Show when={props.topLeft && !fullscreen.active()}>
          <div class="absolute left-2 top-2 z-20 flex max-w-[45%] items-center gap-2">{props.topLeft}</div>
        </Show>
        <Show when={props.topRight && !fullscreen.active()}>
          <div class="absolute right-2 top-2 z-20 flex items-center gap-2">{props.topRight}</div>
        </Show>

        {/* Top-centre tool island, with the active tool's hint (or the host's
            status banner) under it. */}
        <div
          class={cn(
            "pointer-events-none absolute inset-x-2 z-10 flex flex-col items-center gap-1.5",
            toolbarRow2() ? "top-14" : "top-2",
          )}
        >
          <div role="toolbar" aria-label={t("draw.tools")} class={cn(ISLAND, "pointer-events-auto flex items-center gap-0.5 p-1 sm:gap-1.5 sm:p-1.5")}>
            <For each={TOOLS}>
              {(entry) => (
                <>
                  <Show when={entry.tool === "pen" || entry.tool === "eraser"}>
                    <span class="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden="true" />
                  </Show>
                  <button
                    type="button"
                    class={cn(
                      "relative flex h-9 w-9 items-center justify-center rounded-md transition-colors sm:h-10 sm:w-10 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                      activeTool() === entry.tool
                        ? "bg-primary/15 text-primary-text"
                        : "text-foreground/80 hover:bg-muted",
                    )}
                    title={`${t(entry.label)} — ${entry.key}`}
                    aria-label={t(entry.label)}
                    aria-keyshortcuts={entry.key}
                    aria-pressed={activeTool() === entry.tool}
                    onClick={() => pickTool(entry.tool)}
                  >
                    <entry.icon class="h-4 w-4" />
                    <span class="pointer-events-none absolute bottom-0.5 right-1 hidden text-[11px] leading-none text-muted-foreground/80 sm:block">
                      {entry.key}
                    </span>
                  </button>
                </>
              )}
            </For>
          </div>
          <Show
            when={props.banner}
            fallback={
              <Show when={hint() && !toolbarRow2()}>
                <p class="hidden text-center text-[11px] text-muted-foreground sm:block">{hint()}</p>
              </Show>
            }
          >
            <p
              role="status"
              class={cn(
                "pointer-events-auto max-w-md rounded-md border px-3 py-1.5 text-center text-xs font-medium shadow-xs",
                props.bannerTone === "error"
                  ? "border-destructive/30 bg-destructive/10 text-destructive-text"
                  : "border-warning/40 bg-warning/10 text-warning-text",
              )}
            >
              {props.banner}
            </p>
          </Show>
        </div>

        {/* Left style island — only while a drawing tool is active. */}
        <Show when={showsStyle()}>
          <div
            class={cn(
              ISLAND,
              "absolute left-2 z-10 w-44 space-y-3 p-3",
              toolbarRow2() ? "top-26" : "top-14",
              styleOpen() ? "block" : "hidden sm:block",
            )}
          >
            <Section label={t("draw.color")}>
              <For each={COLORS}>
                {(swatch) => (
                  <button
                    type="button"
                    title={t(COLOR_NAMES[swatch])}
                    aria-label={`${t("draw.color")}: ${t(COLOR_NAMES[swatch])}`}
                    aria-pressed={color() === swatch}
                    class={cn(
                      "h-6 w-6 rounded-md transition-shadow focus-visible:outline-hidden",
                      color() === swatch
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-card"
                        : "hover:ring-2 hover:ring-border hover:ring-offset-1 hover:ring-offset-card focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                    style={{ "background-color": swatch }}
                    onClick={() => setColor(swatch)}
                  />
                )}
              </For>
            </Section>

            <Section label={t("draw.width")}>
              <For each={WIDTHS}>
                {(option) => (
                  <button
                    type="button"
                    title={t(option.label)}
                    aria-label={`${t("draw.width")}: ${t(option.label)}`}
                    aria-pressed={width() === option.size}
                    class={optionClass(width() === option.size)}
                    onClick={() => setWidth(option.size)}
                  >
                    <span class="w-4 rounded-full bg-current" style={{ height: `${Math.max(1, option.size / 2)}px` }} />
                  </button>
                )}
              </For>
            </Section>

            <Section label={t("draw.strokeStyle")}>
              <For each={DASHES}>
                {(option) => (
                  <button
                    type="button"
                    title={t(option.label)}
                    aria-label={`${t("draw.strokeStyle")}: ${t(option.label)}`}
                    aria-pressed={dash() === option.dash}
                    class={optionClass(dash() === option.dash)}
                    onClick={() => setDash(option.dash)}
                  >
                    <svg viewBox="0 0 20 20" class="h-4 w-4" aria-hidden="true">
                      <line
                        x1="3"
                        y1="10"
                        x2="17"
                        y2="10"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-dasharray={option.pattern}
                      />
                    </svg>
                  </button>
                )}
              </For>
            </Section>

            <Show when={isShape(activeTool())}>
              <Section label={t("draw.sloppiness")}>
                <For each={SLOPPINESS}>
                  {(option) => (
                    <button
                      type="button"
                      title={t(option.label)}
                      aria-label={`${t("draw.sloppiness")}: ${t(option.label)}`}
                      aria-pressed={slop() === option.slop}
                      class={optionClass(slop() === option.slop)}
                      onClick={() => setSlop(option.slop)}
                    >
                      <svg viewBox="0 0 24 20" class="h-4 w-4" aria-hidden="true">
                        <path d={option.path} fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                      </svg>
                    </button>
                  )}
                </For>
              </Section>
            </Show>
          </div>
        </Show>

        {/* Bottom-left: zoom, then paper and (phones) the style toggle. */}
        <div class="absolute bottom-2 left-2 z-10 flex items-center gap-2">
          <div class={cn(ISLAND, "flex items-center overflow-hidden")}>
            <button type="button" class={plainButton} title={t("draw.zoomOut")} aria-label={t("draw.zoomOut")} onClick={() => zoomBy(1 / ZOOM_STEP)}>
              <span class="text-lg leading-none" aria-hidden="true">−</span>
            </button>
            <button
              type="button"
              class={cn(plainButton, "w-14 font-mono text-xs tabular-nums")}
              title={t("draw.resetZoom")}
              aria-label={t("draw.resetZoom")}
              onClick={resetZoom}
            >
              {Math.round(zoom() * 100)}%
            </button>
            <button type="button" class={plainButton} title={t("draw.zoomIn")} aria-label={t("draw.zoomIn")} onClick={() => zoomBy(ZOOM_STEP)}>
              <span class="text-lg leading-none" aria-hidden="true">+</span>
            </button>
          </div>
          <div class={cn(ISLAND, "flex items-center overflow-hidden")}>
            <button
              type="button"
              class={cn(plainButton, grid() && "bg-primary/15 text-primary-text hover:bg-primary/20 hover:text-primary-text")}
              title={t("draw.showGrid")}
              aria-label={t("draw.showGrid")}
              aria-pressed={grid()}
              onClick={() => setGrid((on) => !on)}
            >
              <IconGrid class="h-4.5 w-4.5" />
            </button>
            <Show when={showsStyle()}>
              <button
                type="button"
                class={cn(plainButton, "sm:hidden")}
                title={t("draw.style")}
                aria-label={t("draw.style")}
                aria-expanded={styleOpen()}
                onClick={() => setStyleOpen((open) => !open)}
              >
                <span class="h-4.5 w-4.5 rounded-md border border-border" style={{ "background-color": color() }} />
              </button>
            </Show>
          </div>
        </div>

        {/* Bottom-right: full screen. */}
        <div class={cn(ISLAND, "absolute bottom-2 right-2 z-10 overflow-hidden")}>
          <FullscreenToggle active={fullscreen.active()} onToggle={fullscreen.toggle} />
        </div>
      </div>
    </div>
  );
}
