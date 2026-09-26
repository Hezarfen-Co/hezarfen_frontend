import type { Point, Stroke } from "./draw-stroke";

// Hit testing for the whiteboard's object eraser: a drag of the eraser is a
// chain of short segments, and a stroke is hit when any of them passes within
// the stroke's half-width (plus the eraser's own reach) of its polyline.

type Box = { x0: number; y0: number; x1: number; y1: number };

// Stroke points never change once committed, so the box is computed once.
const boxes = new WeakMap<Stroke, Box>();

function boxOf(stroke: Stroke): Box {
  let box = boxes.get(stroke);
  if (!box) {
    box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const p of stroke.points) {
      box.x0 = Math.min(box.x0, p.x);
      box.y0 = Math.min(box.y0, p.y);
      box.x1 = Math.max(box.x1, p.x);
      box.y1 = Math.max(box.y1, p.y);
    }
    boxes.set(stroke, box);
  }
  return box;
}

function pointSegmentDist(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/** Shortest distance between segments ab and cd (0 when they cross). */
export function segmentDist(a: Point, b: Point, c: Point, d: Point): number {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return 0;
  return Math.min(pointSegmentDist(a, c, d), pointSegmentDist(b, c, d), pointSegmentDist(c, a, b), pointSegmentDist(d, a, b));
}

/**
 * Does the eraser move from `a` to `b` touch `stroke`? `radius` is the eraser's
 * reach in board-space. Pixel-eraser strokes (older boards) are never targets:
 * they carry no ink of their own.
 */
export function strokeHit(stroke: Stroke, a: Point, b: Point, radius: number): boolean {
  const pts = stroke.points;
  if (stroke.erase || pts.length === 0) return false;
  const reach = stroke.width / 2 + radius;
  const box = boxOf(stroke);
  if (
    Math.max(a.x, b.x) < box.x0 - reach ||
    Math.min(a.x, b.x) > box.x1 + reach ||
    Math.max(a.y, b.y) < box.y0 - reach ||
    Math.min(a.y, b.y) > box.y1 + reach
  ) {
    return false;
  }
  if (pts.length === 1) return pointSegmentDist(pts[0], a, b) <= reach;
  for (let i = 1; i < pts.length; i += 1) {
    if (segmentDist(a, b, pts[i - 1], pts[i]) <= reach) return true;
  }
  return false;
}
