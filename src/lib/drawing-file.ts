import { PAPER_CELL, paintPaper, parseScene, type BgKind, type DrawScene } from "./draw-stroke";
import { embedPngText, extractPngText } from "./png-meta";

/** tEXt keyword under which a drawing's editable stroke JSON is stored inside its PNG. */
const DRAWING_KEYWORD = "hezarfen-drawing";

/** Read the editable scene back out of a drawing PNG's bytes, or null for a plain image. */
export function pngBytesToScene(bytes: Uint8Array): DrawScene | null {
  return parseScene(extractPngText(bytes, DRAWING_KEYWORD));
}

/**
 * Flatten a transparent pad canvas onto white and encode it. The pad layer is
 * transparent so the eraser can cut through it; without the white fill dark
 * strokes would vanish on dark backgrounds once exported. DOM glue — needs a
 * document.
 */
export function canvasToImageBlob(source: HTMLCanvasElement, mime: string, bg: BgKind = "none"): Promise<Blob | null> {
  const out = document.createElement("canvas");
  out.width = source.width;
  out.height = source.height;
  const oc = out.getContext("2d");
  if (!oc) return Promise.resolve(null);
  oc.fillStyle = "#ffffff";
  oc.fillRect(0, 0, out.width, out.height);
  // Paper goes between the white fill and the transparent stroke layer, so erased
  // spots (transparent in `source`) reveal the ruling instead of the strokes.
  const dpr = window.devicePixelRatio || 1;
  paintPaper(oc, bg, out.width, out.height, PAPER_CELL * dpr);
  oc.drawImage(source, 0, 0);
  return new Promise((resolve) => out.toBlob(resolve, mime));
}

/** Encode the pad as a PNG File that both displays as an image and carries its editable scene. */
export async function sceneToPngFile(source: HTMLCanvasElement, scene: DrawScene, name: string): Promise<File> {
  const blob = await canvasToImageBlob(source, "image/png", scene.bg ?? "none");
  if (!blob) throw new Error("canvas PNG export failed");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const withScene = embedPngText(bytes, DRAWING_KEYWORD, JSON.stringify(scene));
  return new File([withScene], name, { type: "image/png" });
}
