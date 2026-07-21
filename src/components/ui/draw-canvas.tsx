import { For, Show, createEffect, createSignal, onCleanup, onMount, untrack } from "solid-js";
import { Button } from "@/components/ui/button";
import { IconDownload, IconEdit, IconEraser, IconSave, IconTrash, IconUndo } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { paintStroke, paintTip, type DrawScene, type Point, type Stroke } from "@/lib/draw-stroke";
import { canvasToImageBlob, sceneToPngFile } from "@/lib/drawing-file";
import { useT } from "@/stores/preferences-context";

const COLORS = ["#1f2937", "#dc2626", "#2563eb", "#16a34a", "#ca8a04"];
const WIDTHS = [2, 6, 14];

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

  const [strokes, setStrokes] = createSignal<Stroke[]>([]);
  const [color, setColor] = createSignal(COLORS[0]);
  const [width, setWidth] = createSignal(WIDTHS[1]);
  const [erasing, setErasing] = createSignal(false);

  const ratio = () => window.devicePixelRatio || 1;
  const context = () => canvas?.getContext("2d") ?? null;

  const redraw = () => {
    const c = context();
    if (!c || !canvas) return;
    const scale = ratio();
    c.setTransform(scale, 0, 0, scale, 0, 0);
    c.clearRect(0, 0, canvas.width / scale, canvas.height / scale);
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
    onCleanup(() => observer.disconnect());
  });

  // Rescale a loaded scene to the current pad size, preserving aspect ratio, so a
  // drawing made on one screen fits when reopened on a differently sized one
  // instead of overflowing or clipping.
  const fitStrokes = (scene: DrawScene): Stroke[] => {
    const rect = canvas?.getBoundingClientRect();
    if (!rect?.width || !scene.w || !scene.h) return scene.strokes;
    const factor = Math.min(rect.width / scene.w, rect.height / scene.h);
    if (Math.abs(factor - 1) < 0.005) return scene.strokes;
    return scene.strokes.map((s) => ({
      ...s,
      width: s.width * factor,
      points: s.points.map((p) => ({ x: p.x * factor, y: p.y * factor })),
    }));
  };

  // Load (or reload) an edited scene whenever the caller supplies one — including
  // while the pad is already open. untrack keeps redraw's read of strokes() from
  // turning this into a self-triggering loop.
  createEffect(() => {
    const scene = props.initialScene;
    untrack(() => {
      setStrokes(scene ? fitStrokes(scene) : []);
      redraw();
    });
  });

  const pointAt = (e: PointerEvent): Point => {
    const rect = canvas!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const drawTip = (stroke: Stroke) => {
    const c = context();
    if (c) paintTip(c, stroke);
  };

  const startStroke = (e: PointerEvent) => {
    if (props.pending) return;
    e.preventDefault();
    canvas?.setPointerCapture(e.pointerId);
    current = {
      color: color(),
      width: erasing() ? width() * 2.5 : width(),
      erase: erasing(),
      points: [pointAt(e)],
    };
    drawTip(current);
  };

  const extendStroke = (e: PointerEvent) => {
    if (!current) return;
    current.points.push(pointAt(e));
    drawTip(current);
  };

  const endStroke = () => {
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

  const save = async () => {
    if (!canvas || !canSave()) return;
    // Points live in CSS px (see pointAt), so the scene box is the canvas's CSS size.
    const rect = canvas.getBoundingClientRect();
    const scene: DrawScene = { v: 1, w: Math.round(rect.width), h: Math.round(rect.height), strokes: strokes() };
    props.onSave(await sceneToPngFile(canvas, scene, props.fileName ?? "drawing.png"));
  };

  const baseName = () => (props.fileName ?? "drawing").replace(/(\.hzdraw)?\.[a-z0-9]+$/i, "");

  const download = async (mime: string, ext: string) => {
    if (!canvas || strokes().length === 0) return;
    const blob = await canvasToImageBlob(canvas, mime);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${baseName()}.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toolClass = (active: boolean) =>
    cn(
      "flex h-11 w-11 items-center justify-center rounded-lg border transition-colors",
      active
        ? "border-primary bg-primary text-primary-foreground shadow-sm"
        : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
    );

  return (
    <div class={cn("space-y-3", props.class)}>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-card p-2 shadow-sm">
        <div class="flex gap-1.5">
          <button type="button" class={toolClass(!erasing())} aria-pressed={!erasing()} title={t("draw.pen")} onClick={() => setErasing(false)}>
            <IconEdit class="h-5 w-5" />
            <span class="sr-only">{t("draw.pen")}</span>
          </button>
          <button type="button" class={toolClass(erasing())} aria-pressed={erasing()} title={t("draw.eraser")} onClick={() => setErasing(true)}>
            <IconEraser class="h-5 w-5" />
            <span class="sr-only">{t("draw.eraser")}</span>
          </button>
        </div>

        <div class="flex gap-1.5" role="group" aria-label={t("draw.color")}>
          <For each={COLORS}>
            {(swatch) => (
              <button
                type="button"
                aria-pressed={color() === swatch && !erasing()}
                title={t("draw.color")}
                class={cn(
                  "h-11 w-11 rounded-lg border-2 transition-transform",
                  color() === swatch && !erasing() ? "border-foreground scale-105" : "border-border/60 hover:scale-105",
                )}
                style={{ "background-color": swatch }}
                onClick={() => {
                  setColor(swatch);
                  setErasing(false);
                }}
              >
                <span class="sr-only">{swatch}</span>
              </button>
            )}
          </For>
        </div>

        <div class="flex gap-1.5" role="group" aria-label={t("draw.width")}>
          <For each={WIDTHS}>
            {(size) => (
              <button type="button" aria-pressed={width() === size} title={t("draw.width")} class={toolClass(width() === size)} onClick={() => setWidth(size)}>
                <span class="rounded-full bg-current" style={{ width: `${size + 2}px`, height: `${size + 2}px` }} />
                <span class="sr-only">{size}</span>
              </button>
            )}
          </For>
        </div>

        <div class="ml-auto flex gap-1.5">
          <button type="button" class={toolClass(false)} disabled={strokes().length === 0} title={t("draw.undo")} onClick={undo}>
            <IconUndo class="h-5 w-5" />
            <span class="sr-only">{t("draw.undo")}</span>
          </button>
          <button type="button" class={toolClass(false)} disabled={strokes().length === 0} title={t("draw.clear")} onClick={clear}>
            <IconTrash class="h-5 w-5" />
            <span class="sr-only">{t("draw.clear")}</span>
          </button>
        </div>
      </div>

      <div ref={wrap} class="relative h-[22rem] overflow-hidden rounded-lg border bg-white shadow-inner">
        <canvas
          ref={canvas}
          class="h-full w-full touch-none"
          onPointerDown={startStroke}
          onPointerMove={extendStroke}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
        />
        <Show when={strokes().length === 0 && !current}>
          <p class="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">{t("draw.hint")}</p>
        </Show>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <Button type="button" class="h-10 gap-2" disabled={props.pending || !canSave()} onClick={() => void save()}>
          <IconSave class="h-4 w-4" />
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
