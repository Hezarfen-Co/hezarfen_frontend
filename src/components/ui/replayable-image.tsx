import { Show, Suspense, createSignal, lazy } from "solid-js";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { pngBytesToScene } from "@/lib/drawing-file";
import { playableScene, type DrawScene } from "@/lib/draw-stroke";
import { useT } from "@/stores/preferences-context";

const DrawingPlayback = lazy(() => import("@/components/ui/drawing-playback").then((m) => ({ default: m.DrawingPlayback })));

/**
 * An uploaded image with optional stroke-by-stroke playback. Defaults to the static
 * <img>; "Play drawing" fetches the bytes, recovers the scene embedded in the PNG and
 * swaps in the replay. A plain photo (no embedded strokes) falls back to the img and
 * drops the button — nothing to replay.
 */
export function ReplayableImage(props: {
  fetchBlob: () => Promise<Blob>;
  src: string;
  alt: string;
  /** Sizes the img, the loading box and the playback canvas — the swap can't change size. */
  imgClass: string;
  class?: string;
}) {
  const t = useT();
  const [scene, setScene] = createSignal<DrawScene | null>(null);
  const [mode, setMode] = createSignal<"image" | "loading" | "playback" | "plain">("image");

  const enterPlayback = async () => {
    if (scene()) {
      setMode("playback");
      return;
    }
    setMode("loading");
    try {
      const blob = await props.fetchBlob();
      const parsed = pngBytesToScene(new Uint8Array(await blob.arrayBuffer()));
      const playable = playableScene(parsed);
      if (playable) {
        setScene(playable);
        setMode("playback");
      } else {
        setMode("plain"); // plain image or no strokes → keep the img, hide Play
      }
    } catch {
      setMode("image"); // fetch failed → keep the img, allow a retry
    }
  };

  return (
    <div class={cn("space-y-2", props.class)}>
      {/* local boundary: the lazy playback chunk must not suspend the page around it */}
      {/* min-h reserves the box while the chunk loads: imgClass alone can be height:auto → 0px */}
      <Suspense fallback={<div class={cn("min-h-64", props.imgClass)} />}>
        <Show when={mode() === "playback" && scene()} fallback={<img src={props.src} alt={props.alt} class={props.imgClass} />}>
          {(s) => <DrawingPlayback scene={s()} canvasClass={props.imgClass} />}
        </Show>
      </Suspense>
      <Show when={mode() !== "plain"}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={mode() === "loading"}
          onClick={() => (mode() === "playback" ? setMode("image") : void enterPlayback())}
        >
          {mode() === "playback" ? t("exams.showImage") : t("exams.playDrawing")}
        </Button>
      </Show>
    </div>
  );
}
