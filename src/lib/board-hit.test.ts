import { describe, expect, it } from "vitest";
import { segmentDist, strokeHit } from "./board-hit";
import type { Stroke } from "./draw-stroke";

const line = (over: Partial<Stroke> = {}): Stroke => ({
  color: "#000",
  width: 4,
  erase: false,
  points: [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ],
  ...over,
});

describe("segmentDist", () => {
  it("is zero for crossing segments", () => {
    expect(segmentDist({ x: 0, y: -5 }, { x: 0, y: 5 }, { x: -5, y: 0 }, { x: 5, y: 0 })).toBe(0);
  });

  it("measures the gap between parallel segments", () => {
    expect(segmentDist({ x: 0, y: 3 }, { x: 10, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(3);
  });
});

describe("strokeHit", () => {
  it("hits when the eraser crosses the line", () => {
    expect(strokeHit(line(), { x: 50, y: -20 }, { x: 50, y: 20 }, 2)).toBe(true);
  });

  it("hits within half the stroke width plus the eraser reach", () => {
    expect(strokeHit(line(), { x: 50, y: 5 }, { x: 60, y: 5 }, 3)).toBe(true);
    expect(strokeHit(line(), { x: 50, y: 6 }, { x: 60, y: 6 }, 3)).toBe(false);
  });

  it("misses a stroke far outside its box", () => {
    expect(strokeHit(line(), { x: 500, y: 500 }, { x: 510, y: 510 }, 4)).toBe(false);
  });

  it("hits a single-point dot", () => {
    expect(strokeHit(line({ points: [{ x: 10, y: 10 }] }), { x: 0, y: 12 }, { x: 20, y: 12 }, 1)).toBe(true);
  });

  it("never targets a pixel-eraser stroke or an empty one", () => {
    expect(strokeHit(line({ erase: true }), { x: 50, y: -20 }, { x: 50, y: 20 }, 2)).toBe(false);
    expect(strokeHit(line({ points: [] }), { x: 50, y: -20 }, { x: 50, y: 20 }, 2)).toBe(false);
  });
});
