import { createSignal, onCleanup, onMount } from "solid-js";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { PAPER_CELL, paintPaper, paintStroke, sliceStrokes, type DrawScene } from "@/lib/draw-stroke";
import { useT } from "@/stores/preferences-context";

// ponytail: synthetic order-only pace — the drawing carries no per-point timing, so
// every answer replays at this constant point rate. Bump if playback feels too fast/slow.
const POINTS_PER_SECOND = 220;

/**
 * Replays a recovered drawing scene stroke-by-stroke in drawn order. Mirrors the
 * export pipeline (drawing-file `renderBounds`/`canvasToImageBlob`) so a fully
 * revealed frame is pixel-identical to the static answer <img>: strokes go on a
 * transparent layer (erasers cut only ink), then that layer is composited over
 * white + paper ruling. No timestamps are read — order + a synthetic pace only.
 */
export function DrawingPlayback(props: { scene: DrawScene; class?: string }) {
  const t = useT();
  let canvas: HTMLCanvasElement | undefined;
  let layer: HTMLCanvasElement | undefined; // offscreen transparent stroke layer (the export's `source`)
  let raf = 0;
  let startedAt = 0; // performance.now() when the current run began
  let baseCount = 0; // points already revealed when the run began (so pause/resume continues)
  let revealed = 0;
  // ponytail: DPR snapshotted at mount so the backing store and the paint transform can't
  // drift apart when browser zoom changes mid-run; re-inits on remount (Show image → Play).
  let scale = 1;

  const total = () => props.scene.strokes.reduce((n, s) => n + s.points.length, 0);
  const [playing, setPlaying] = createSignal(true);

  const paint = (count: number) => {
    const s = props.scene;
    const lc = layer?.getContext("2d");
    const mc = canvas?.getContext("2d");
    if (!layer || !canvas || !lc || !mc) return;
    // 1. stroke layer: clear + replay the revealed prefix in world coords. Strokes are
    //    already baked into the scene box, so a plain DPR scale places them like the export.
    lc.setTransform(scale, 0, 0, scale, 0, 0);
    lc.clearRect(0, 0, s.w, s.h);
    const { full, partial } = sliceStrokes(s.strokes, count);
    for (const st of full) paintStroke(lc, st);
    if (partial) paintStroke(lc, partial);
    // 2. main canvas: white → paper → composite the ink (matches canvasToImageBlob).
    mc.setTransform(1, 0, 0, 1, 0, 0);
    mc.fillStyle = "#ffffff";
    mc.fillRect(0, 0, canvas.width, canvas.height);
    paintPaper(mc, s.bg ?? "none", canvas.width, canvas.height, PAPER_CELL * scale);
    mc.drawImage(layer, 0, 0);
  };

  const loop = () => {
    const elapsed = (performance.now() - startedAt) / 1000;
    revealed = Math.min(total(), baseCount + Math.floor(elapsed * POINTS_PER_SECOND));
    paint(revealed);
    if (revealed >= total()) {
      setPlaying(false); // reached the end: freeze on the complete drawing
      return;
    }
    raf = requestAnimationFrame(loop);
  };

  const play = () => {
    if (revealed >= total()) revealed = 0; // finished → replay from the start
    baseCount = revealed;
    startedAt = performance.now();
    setPlaying(true);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  };

  const pause = () => {
    cancelAnimationFrame(raf);
    setPlaying(false);
  };

  const restart = () => {
    revealed = 0;
    play();
  };

  onMount(() => {
    scale = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(props.scene.w * scale));
    const h = Math.max(1, Math.round(props.scene.h * scale));
    if (canvas) {
      canvas.width = w;
      canvas.height = h;
    }
    layer = document.createElement("canvas");
    layer.width = w;
    layer.height = h;
    play(); // auto-start from blank — the teacher clicked "play" to get here
  });

  onCleanup(() => cancelAnimationFrame(raf));

  return (
    <div class={cn("space-y-2", props.class)}>
      <canvas ref={canvas} class="h-64 w-full max-w-2xl rounded-md border bg-background object-contain" />
      <div class="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => (playing() ? pause() : play())}>
          {playing() ? t("exams.pause") : t("exams.play")}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={restart}>
          {t("exams.restart")}
        </Button>
      </div>
    </div>
  );
}
