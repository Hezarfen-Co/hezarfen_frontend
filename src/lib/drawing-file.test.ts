import { describe, expect, it } from "vitest";
import type { DrawScene } from "./draw-stroke";
import { pngBytesToScene } from "./drawing-file";
import { embedPngText } from "./png-meta";

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Chunk-walkable 1x1 PNG (signature + IHDR + IEND); enough carrier for embed/extract. */
function minimalPng(): Uint8Array {
  const ihdr = [0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0];
  return new Uint8Array([
    ...SIGNATURE,
    0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, ...ihdr, 0, 0, 0, 0,
    0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0, 0, 0, 0,
  ]);
}

describe("pngBytesToScene", () => {
  it("round-trips a scene carried in the PNG's tEXt chunk", () => {
    const scene: DrawScene = {
      v: 1,
      w: 120,
      h: 90,
      strokes: [{ color: "#1f2937", width: 6, erase: false, points: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }],
    };
    const png = embedPngText(minimalPng(), "hezarfen-drawing", JSON.stringify(scene));
    expect(pngBytesToScene(png)).toEqual(scene);
  });

  it("returns null for a plain PNG with no embedded scene", () => {
    expect(pngBytesToScene(minimalPng())).toBeNull();
  });
});
