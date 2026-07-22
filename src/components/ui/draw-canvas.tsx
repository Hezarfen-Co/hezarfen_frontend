import { For, Match, Show, Switch, createEffect, createSignal, onCleanup, onMount, untrack } from "solid-js";
import { Button } from "@/components/ui/button";
import { IconDownload, IconEdit, IconEraser, IconGrid, IconMove, IconRuled, IconSquareOff, IconTrash, IconUndo, IconZoomIn, IconZoomOut } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { PAPER_CELL, PAPER_LINE, canvasPx, paintStroke, paintTip, strokesBounds, type BgKind, type DrawScene, type Point, type Stroke } from "@/lib/draw-stroke";
import { canvasToImageBlob, sceneToPngFile } from "@/lib/drawing-file";
import { useT } from "@/stores/preferences-context";

const COLORS = ["#1f2937", "#dc2626", "#2563eb", "#16a34a", "#ca8a04"];
const WIDTHS = [2, 6, 14];
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;
const ZOOM_STEP = 1.25;
// Whitespace kept around the drawn region when exporting the bounding box.
const EXPORT_MARGIN = 8;
// Floating glass overlays that live inside the canvas, matching the bottom-right
// zoom control. Position/size utilities are appended per overlay via cn().
const OVERLAY_CARD = "absolute z-10 flex gap-1.5 rounded-lg border bg-card/90 p-1.5 shadow-sm backdrop-blur-sm";
const OVERLAY_BTN = "flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

/**
 * Freehand drawing pad. `props.onSave` receives a PNG `File` that both displays
 * as a normal image and carries its editable stroke JSON in a tEXt chunk, so the
 * same File feeds every existing upload seam (`postNoteFile`,
 * `postExamQuestionImage`) and a saved drawing can be reopened via `initialScene`.
 * PNG/JPEG buttons additionally download a flat image straight to the device.
 */
export function DrawCanvas(props: {
  onSave: (file: File) => void;
  initialScene?: DrawScene | null;
  fileName?: string;
  pending?: boolean;
  class?: string;
}) {
  const t = useT();
  let canvas: HTMLCanvasElement | undefined;
  let wrap: HTMLDivElement | undefined;
  let current: Stroke | undefined;
  // Live pan drag: pointer origin + pan value at grab, so the pad follows the finger.
  let panStart: { x: number; y: number; px: number; py: number } | undefined;

  const [strokes, setStrokes] = createSignal<Stroke[]>([]);
  const [color, setColor] = createSignal(COLORS[0]);
  const [width, setWidth] = createSignal(WIDTHS[1]);
  const [erasing, setErasing] = createSignal(false);
  const [hand, setHand] = createSignal(false);
  // Transient tool while a non-left button is held (middle = pan, right = erase),
  // so the toolbar highlights it as if clicked and reverts on release.
  const [override, setOverride] = createSignal<null | "pan" | "erase">(null);
  // The pad is unbounded — strokes live in world coords; pan is the world→screen
  // offset in CSS px so you can move around a drawing larger than the viewport.
  const [pan, setPan] = createSignal({ x: 0, y: 0 });
  // View-only magnification: screenCSS = world * zoom + pan. Strokes stay in world
  // px, so stroke widths scale with the transform — never multiply them by hand.
  const [zoom, setZoom] = createSignal(1);
  // Notebook paper, drawn as CSS on the wrapper (never in redraw(), or the eraser
  // would cut it). New pads default to squared grid — the look the pad is for.
  const [bg, setBg] = createSignal<BgKind>("grid");
  // Which floating picker is open (pen/eraser line-thickness, or paper style).
  // Driven by JS, not CSS :focus-within — a mouse click keeps focus on the trigger
  // and the canvas isn't focusable to blur it, so focus-within stayed stuck open.
  const [openMenu, setOpenMenu] = createSignal<null | "pen" | "eraser" | "paper">(null);

  const ratio = () => window.devicePixelRatio || 1;
  const context = () => canvas?.getContext("2d") ?? null;

  // Transient override wins over the persistent tool so the toolbar reflects a held button.
  const activeTool = (): "pen" | "erase" | "pan" => {
    const o = override();
    if (o) return o;
    if (hand()) return "pan";
    if (erasing()) return "erase";
    return "pen";
  };

  const redraw = () => {
    const c = context();
    if (!c || !canvas) return;
    const scale = ratio();
    // Clear the whole backing store in device pixels, then shift into world space
    // by the pan offset so off-origin strokes render where the pan puts them.
    c.setTransform(scale, 0, 0, scale, 0, 0);
    c.clearRect(0, 0, canvas.width / scale, canvas.height / scale);
    const p = pan();
    const z = zoom();
    c.setTransform(z * scale, 0, 0, z * scale, p.x * scale, p.y * scale);
    for (const stroke of strokes()) paintStroke(c, stroke);
    if (current) paintStroke(c, current);
  };

  // The backing store is DPR-scaled; without this strokes land blurry and offset.
  const resize = () => {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const scale = ratio();
    canvas.width = Math.round(rect.width * scale);
    canvas.height = Math.round(rect.height * scale);
    redraw();
  };

  onMount(() => {
    resize();
    const observer = new ResizeObserver(() => resize());
    if (wrap) observer.observe(wrap);
    // Close any open flyout on a pointerdown outside every picker group, or Escape.
    // The canvas isn't focusable, so nothing would otherwise dismiss it.
    const onDocDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement | null)?.closest("[data-draw-menu]")) setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("pointerdown", onDocDown);
    document.addEventListener("keydown", onKey);
    onCleanup(() => {
      observer.disconnect();
      document.removeEventListener("pointerdown", onDocDown);
      document.removeEventListener("keydown", onKey);
    });
  });

  // Load (or reload) an edited scene whenever the caller supplies one — including
  // while the pad is already open. No rescale: the pad is unbounded, so rather than
  // shrinking a big drawing to fit we keep it 1:1 and pan its content into the
  // corner (you move around it from there). untrack keeps redraw's read of
  // strokes() from turning this into a self-triggering loop.
  createEffect(() => {
    const scene = props.initialScene;
    untrack(() => {
      const next = scene ? scene.strokes : [];
      setStrokes(next);
      setBg(scene?.bg ?? "none"); // old drawings lack bg → plain, preserving their original look
      setZoom(1); // a reopened drawing starts at 100%
      const b = strokesBounds(next);
      setPan(b ? { x: EXPORT_MARGIN - b.x, y: EXPORT_MARGIN - b.y } : { x: 0, y: 0 });
      redraw();
    });
  });

  const pointAt = (e: PointerEvent): Point => {
    const rect = canvas!.getBoundingClientRect();
    const p = pan();
    const z = zoom();
    return { x: (e.clientX - rect.left - p.x) / z, y: (e.clientY - rect.top - p.y) / z };
  };

  // Zoom around the pad center: keep the world point under the center fixed so
  // content doesn't fly off. Clamped to [ZOOM_MIN, ZOOM_MAX].
  // ponytail: no pinch-zoom; buttons + wheel cover it, add 2-pointer tracking if touch users ask
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

  // Snap back to 100% while keeping the centered content centered (no-op at 1).
  const resetZoom = () => zoomBy(1 / zoom());

  const drawTip = (stroke: Stroke) => {
    const c = context();
    if (c) paintTip(c, stroke);
  };

  const startStroke = (e: PointerEvent) => {
    if (props.pending) return;
    e.preventDefault();
    canvas?.setPointerCapture(e.pointerId);
    // Middle button (1) always pans; the hand tool pans on any button EXCEPT right,
    // because right button always erases (see below). button is the real value only
    // on pointerdown; -1 during move, which is why panStart/current carry the state.
    if (e.button === 1 || (hand() && e.button !== 2)) {
      if (e.button === 1) setOverride("pan"); // transient middle-button pan
      const p = pan();
      panStart = { x: e.clientX, y: e.clientY, px: p.x, py: p.y };
      return;
    }
    // Right button (2) forces an erase stroke regardless of the selected tool.
    const eraseNow = erasing() || e.button === 2;
    if (e.button === 2) setOverride("erase"); // transient right-button erase
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
      return;
    }
    const done = current;
    current = undefined;
    if (!done) return;
    setStrokes((all) => [...all, done]);
    redraw(); // swap the live polyline for its smoothed replay
  };

  const undo = () => {
    setStrokes((all) => all.slice(0, -1));
    redraw();
  };

  const clear = () => {
    setStrokes([]);
    redraw();
  };

  // Editing lets you clear a drawing and save the blank (persist the erase); a
  // brand-new untouched pad has nothing to save.
  const canSave = () => strokes().length > 0 || props.initialScene != null;

  // Render only the drawn region (not the viewport) onto an offscreen DPR-scaled
  // canvas, and produce the matching scene with strokes shifted into that box.
  // This is what makes the pad "infinite": export follows the content wherever it
  // was drawn or panned to, instead of capturing what happens to be on screen.
  const renderBounds = (): { canvas: HTMLCanvasElement; scene: DrawScene } | null => {
    const list = strokes();
    const b = strokesBounds(list);
    if (!b) return null;
    const scale = ratio();
    const w = Math.ceil(b.w + EXPORT_MARGIN * 2);
    const h = Math.ceil(b.h + EXPORT_MARGIN * 2);
    const dx = EXPORT_MARGIN - b.x;
    const dy = EXPORT_MARGIN - b.y;
    const off = document.createElement("canvas");
    off.width = canvasPx(w, scale);
    off.height = canvasPx(h, scale);
    const oc = off.getContext("2d");
    if (!oc) return null;
    oc.setTransform(scale, 0, 0, scale, dx * scale, dy * scale);
    for (const s of list) paintStroke(oc, s);
    const shifted = list.map((s) => ({ ...s, points: s.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) }));
    // dpr rides along: the PNG is baked at this ratio, so a viewer on a different
    // display can size the replay to the same pixels instead of its own ratio.
    const scene: DrawScene = { v: 1, w, h, strokes: shifted, bg: bg(), dpr: scale };
    return { canvas: off, scene };
  };

  const save = async () => {
    if (!canSave()) return;
    const name = props.fileName ?? "drawing.png";
    const rendered = renderBounds();
    if (rendered) {
      props.onSave(await sceneToPngFile(rendered.canvas, rendered.scene, name));
      return;
    }
    // Cleared while editing an existing drawing: save a 1×1 blank to persist the erase.
    const blank = document.createElement("canvas");
    blank.width = 1;
    blank.height = 1;
    props.onSave(await sceneToPngFile(blank, { v: 1, w: 1, h: 1, strokes: [], bg: bg() }, name));
  };

  const baseName = () => (props.fileName ?? "drawing").replace(/(\.hzdraw)?\.[a-z0-9]+$/i, "");

  const download = async (mime: string, ext: string) => {
    const rendered = renderBounds();
    if (!rendered) return;
    const blob = await canvasToImageBlob(rendered.canvas, mime, bg());
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${baseName()}.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Live ruling via CSS gradients so lines pan and zoom WITH the content: world
  // cell PAPER_CELL → PAPER_CELL*zoom on screen, a world-origin line sits at pan.
  // (Export bakes its own ruling; the two aren't pixel-identical, and needn't be.)
  const paperStyle = () => {
    const kind = bg();
    if (kind === "none") return {};
    const cell = PAPER_CELL * zoom();
    const p = pan();
    if (kind === "grid") {
      return {
        "background-image": `linear-gradient(to right, ${PAPER_LINE} 1px, transparent 1px), linear-gradient(to bottom, ${PAPER_LINE} 1px, transparent 1px)`,
        "background-size": `${cell}px ${cell}px`,
        "background-position": `${p.x}px ${p.y}px`,
      };
    }
    return {
      "background-image": `linear-gradient(to bottom, ${PAPER_LINE} 1px, transparent 1px)`,
      "background-size": `100% ${cell}px`,
      "background-position": `0 ${p.y}px`,
    };
  };

  const bgLabel = () => (bg() === "none" ? t("draw.bgNone") : bg() === "lines" ? t("draw.bgLines") : t("draw.bgGrid"));

  const toolClass = (active: boolean) =>
    cn(
      "flex h-11 w-11 items-center justify-center rounded-lg border transition-colors",
      active
        ? "border-primary bg-primary text-primary-foreground shadow-sm"
        : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
    );

  // Line-thickness flyout shared by the pen and eraser triggers (width is one
  // shared signal, so both open the same picker). A JSX-returning local, not a
  // second exported component — one file, one component. Visibility is driven by
  // openMenu() (see the pointer/click handlers on each trigger); the pt-1.5 wrapper
  // bridges the gap so the mouse can travel trigger→flyout without pointerleave
  // firing. z-20 sits it above the sibling islands.
  const widthPicker = (id: "pen" | "eraser") => (
    <div
      class={cn(
        "absolute left-0 top-full z-20 pt-1.5 transition",
        openMenu() === id ? "translate-y-0 opacity-100" : "pointer-events-none invisible translate-y-1 opacity-0",
      )}
    >
      <div class={cn(OVERLAY_CARD, "static")} role="group" aria-label={t("draw.width")}>
        <For each={WIDTHS}>
          {(size) => (
            <button
              type="button"
              aria-pressed={width() === size}
              title={t("draw.width")}
              class={toolClass(width() === size)}
              onClick={() => {
                setWidth(size);
                setOpenMenu(null);
              }}
            >
              <span class="rounded-full bg-current" style={{ width: `${size + 2}px`, height: `${size + 2}px` }} />
              <span class="sr-only">{size}</span>
            </button>
          )}
        </For>
      </div>
    </div>
  );

  return (
    <div class={cn("space-y-3", props.class)}>
      <div ref={wrap} class="relative h-[26rem] overflow-hidden rounded-lg border bg-white shadow-inner sm:h-[30rem]" style={paperStyle()}>
        <canvas
          ref={canvas}
          class="h-full w-full touch-none"
          classList={{ "cursor-grab": activeTool() === "pan" }}
          onMouseDown={(e) => {
            // preventDefault in pointerdown does not stop the middle-click autoscroll widget.
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
        <Show when={strokes().length === 0 && !current}>
          <p class="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">{t("draw.hint")}</p>
        </Show>

        {/* Top-left island — tools only: pen, eraser, pan. Pen and eraser each
            reveal the shared line-thickness flyout (open on hover/tap, toggled via
            openMenu()); pan has no flyout. */}
        <div class={cn(OVERLAY_CARD, "left-2 top-2")}>
          <div
            data-draw-menu
            class="relative"
            onPointerEnter={(e) => {
              if (e.pointerType !== "touch") setOpenMenu("pen");
            }}
            onPointerLeave={(e) => {
              if (e.pointerType !== "touch") setOpenMenu(null);
            }}
          >
            <button
              type="button"
              class={toolClass(activeTool() === "pen")}
              aria-haspopup="true"
              aria-expanded={openMenu() === "pen"}
              aria-pressed={activeTool() === "pen"}
              title={t("draw.pen")}
              onClick={() => {
                setErasing(false);
                setHand(false);
                setOpenMenu((o) => (o === "pen" ? null : "pen"));
              }}
            >
              <IconEdit class="h-5 w-5" />
              <span class="sr-only">{t("draw.pen")}</span>
            </button>
            {widthPicker("pen")}
          </div>
          <div
            data-draw-menu
            class="relative"
            onPointerEnter={(e) => {
              if (e.pointerType !== "touch") setOpenMenu("eraser");
            }}
            onPointerLeave={(e) => {
              if (e.pointerType !== "touch") setOpenMenu(null);
            }}
          >
            <button
              type="button"
              class={toolClass(activeTool() === "erase")}
              aria-haspopup="true"
              aria-expanded={openMenu() === "eraser"}
              aria-pressed={activeTool() === "erase"}
              title={t("draw.eraser")}
              onClick={() => {
                setErasing(true);
                setHand(false);
                setOpenMenu((o) => (o === "eraser" ? null : "eraser"));
              }}
            >
              <IconEraser class="h-5 w-5" />
              <span class="sr-only">{t("draw.eraser")}</span>
            </button>
            {widthPicker("eraser")}
          </div>
          <button type="button" class={toolClass(activeTool() === "pan")} aria-pressed={activeTool() === "pan"} title={t("draw.pan")} onClick={() => setHand(true)}>
            <IconMove class="h-5 w-5" />
            <span class="sr-only">{t("draw.pan")}</span>
          </button>
        </div>

        {/* Top-middle island — colour swatches */}
        <div class={cn(OVERLAY_CARD, "left-1/2 top-2 -translate-x-1/2 flex-wrap items-center")} role="group" aria-label={t("draw.color")}>
          <For each={COLORS}>
            {(swatch) => (
              <button
                type="button"
                aria-pressed={color() === swatch && activeTool() === "pen"}
                title={t("draw.color")}
                class={cn(
                  "h-9 w-9 sm:h-11 sm:w-11 rounded-lg border-2 transition-transform",
                  color() === swatch && activeTool() === "pen" ? "border-foreground scale-105" : "border-border/60 hover:scale-105",
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

        {/* Top-right island — paper selector. The trigger shows the current paper;
            hover/tap toggles the none/lines/grid flyout via openMenu(). The card is
            already `absolute` (its own containing block), so the flyout positions off
            it without a `relative` wrapper. */}
        <div
          data-draw-menu
          class={cn(OVERLAY_CARD, "right-2 top-2")}
          onPointerEnter={(e) => {
            if (e.pointerType !== "touch") setOpenMenu("paper");
          }}
          onPointerLeave={(e) => {
            if (e.pointerType !== "touch") setOpenMenu(null);
          }}
        >
          <button
            type="button"
            class={toolClass(bg() !== "none")}
            aria-haspopup="true"
            aria-expanded={openMenu() === "paper"}
            aria-pressed={bg() !== "none"}
            title={bgLabel()}
            onClick={() => setOpenMenu((o) => (o === "paper" ? null : "paper"))}
          >
            <Switch>
              <Match when={bg() === "none"}>
                <IconSquareOff class="h-5 w-5" />
              </Match>
              <Match when={bg() === "lines"}>
                <IconRuled class="h-5 w-5" />
              </Match>
              <Match when={bg() === "grid"}>
                <IconGrid class="h-5 w-5" />
              </Match>
            </Switch>
            <span class="sr-only">{bgLabel()}</span>
          </button>
          {/* Paper flyout — opens downward, right-aligned; pt-1.5 bridges the gap so
              the mouse can travel trigger→flyout without pointerleave firing. */}
          <div
            class={cn(
              "absolute right-0 top-full z-20 pt-1.5 transition",
              openMenu() === "paper" ? "translate-y-0 opacity-100" : "pointer-events-none invisible translate-y-1 opacity-0",
            )}
          >
            <div class={cn(OVERLAY_CARD, "static")} role="group" aria-label={t("draw.paper")}>
              <button
                type="button"
                class={toolClass(bg() === "none")}
                aria-pressed={bg() === "none"}
                title={t("draw.bgNone")}
                onClick={() => {
                  setBg("none");
                  setOpenMenu(null);
                }}
              >
                <IconSquareOff class="h-5 w-5" />
                <span class="sr-only">{t("draw.bgNone")}</span>
              </button>
              <button
                type="button"
                class={toolClass(bg() === "lines")}
                aria-pressed={bg() === "lines"}
                title={t("draw.bgLines")}
                onClick={() => {
                  setBg("lines");
                  setOpenMenu(null);
                }}
              >
                <IconRuled class="h-5 w-5" />
                <span class="sr-only">{t("draw.bgLines")}</span>
              </button>
              <button
                type="button"
                class={toolClass(bg() === "grid")}
                aria-pressed={bg() === "grid"}
                title={t("draw.bgGrid")}
                onClick={() => {
                  setBg("grid");
                  setOpenMenu(null);
                }}
              >
                <IconGrid class="h-5 w-5" />
                <span class="sr-only">{t("draw.bgGrid")}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom-left history */}
        <div class={cn(OVERLAY_CARD, "bottom-2 left-2")}>
          <button
            type="button"
            class={cn(OVERLAY_BTN, "rounded-md disabled:pointer-events-none disabled:opacity-40")}
            disabled={strokes().length === 0}
            title={t("draw.undo")}
            onClick={undo}
          >
            <IconUndo class="h-5 w-5" />
            <span class="sr-only">{t("draw.undo")}</span>
          </button>
          <button
            type="button"
            class={cn(OVERLAY_BTN, "rounded-md disabled:pointer-events-none disabled:opacity-40")}
            disabled={strokes().length === 0}
            title={t("draw.clear")}
            onClick={clear}
          >
            <IconTrash class="h-5 w-5" />
            <span class="sr-only">{t("draw.clear")}</span>
          </button>
        </div>

        <div class="absolute bottom-2 right-2 z-10 flex flex-col divide-y divide-border overflow-hidden rounded-lg border bg-card/90 shadow-sm backdrop-blur-sm">
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

      <div class="flex flex-wrap items-center gap-2">
        <Button type="button" class="h-10 px-5" disabled={props.pending || !canSave()} onClick={() => void save()}>
          {t("draw.save")}
        </Button>
        <Button type="button" variant="outline" class="h-10 gap-2" disabled={strokes().length === 0} onClick={() => void download("image/png", "png")}>
          <IconDownload class="h-4 w-4" />
          {t("draw.downloadPng")}
        </Button>
        <Button type="button" variant="outline" class="h-10 gap-2" disabled={strokes().length === 0} onClick={() => void download("image/jpeg", "jpg")}>
          <IconDownload class="h-4 w-4" />
          {t("draw.downloadJpeg")}
        </Button>
      </div>
    </div>
  );
}
