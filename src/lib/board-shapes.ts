import type { Point, Stroke } from "./draw-stroke";

// Whiteboard shapes (Excalidraw-style rectangle, diamond, ellipse, line and
// arrow) are baked into ordinary freehand strokes before they leave the
// client. The board backend only stores stroke payloads, so a shape travels,
// persists and replays exactly like a pen line — no new wire kind, and every
// history replay draws it without knowing it was ever a shape.

export type ShapeKind = "rectangle" | "diamond" | "ellipse" | "line" | "arrow";
/** 0 architect (clean), 1 artist (a gentle hand wobble), 2 cartoonist (two loose passes). */
export type Sloppiness = 0 | 1 | 2;
export type ShapeStyle = Pick<Stroke, "color" | "width" | "dash">;

/** Below this drag distance (world px) a shape is a stray click, not a shape. */
const MIN_SIZE = 2;
/** Distance of the guard points placed beside every sharp corner. */
const CORNER_GUARD = 1.5;
const ELLIPSE_SEGMENTS = 72;

/** Small deterministic PRNG (mulberry32) so a seed always yields the same wobble. */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Shift-drag: equal sides for boxes, a 45° snap for lines and arrows. */
export function constrainEnd(kind: ShapeKind, a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (kind === "line" || kind === "arrow") {
    const step = Math.PI / 4;
    const angle = Math.round(Math.atan2(dy, dx) / step) * step;
    const len = Math.hypot(dx, dy);
    return { x: a.x + Math.cos(angle) * len, y: a.y + Math.sin(angle) * len };
  }
  const side = Math.max(Math.abs(dx), Math.abs(dy));
  return { x: a.x + (dx < 0 ? -side : side), y: a.y + (dy < 0 ? -side : side) };
}

/**
 * Points from `a` (inclusive) toward `b` (exclusive). The renderer smooths a
 * polyline with midpoint quadratics, which would cut a bare corner to the
 * midpoints of its edges — so a guard point sits just inside each end and the
 * corner only rounds by a pixel. A sloppy edge bows sideways along a half sine.
 */
function edge(a: Point, b: Point, bow: number, rand: () => number, jitter: number): Point[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return [a];
  const nx = -dy / len;
  const ny = dx / len;
  const guard = Math.min(CORNER_GUARD, len / 4) / len;
  const inner = bow === 0 ? 0 : Math.min(16, Math.max(2, Math.ceil(len / 24)));
  const ts = [0, guard];
  for (let i = 1; i < inner; i += 1) ts.push(i / inner);
  ts.push(1 - guard);
  const out: Point[] = [];
  for (const t of ts) {
    const off = Math.sin(Math.PI * t) * bow + (t === 0 ? (rand() * 2 - 1) * jitter : 0);
    out.push({ x: a.x + dx * t + nx * off, y: a.y + dy * t + ny * off });
  }
  return out;
}

/** One closed or open pass through `vertices`, each edge bowed by the sloppiness. */
function polygonPass(vertices: Point[], closed: boolean, slop: Sloppiness, rand: () => number): Point[] {
  const last = closed ? vertices.length : vertices.length - 1;
  const out: Point[] = [];
  for (let i = 0; i < last; i += 1) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const bow = slop === 0 ? 0 : (rand() * 2 - 1) * Math.min(len * 0.015 * slop, 1.6 * slop);
    out.push(...edge(a, b, bow, rand, slop * 0.6));
  }
  const end = closed ? vertices[0] : vertices[vertices.length - 1];
  out.push(end);
  // A loose hand overshoots where a closed outline meets itself.
  if (closed && slop > 0 && out.length > 2) {
    const next = out[1];
    const f = 0.35 + rand() * 0.25;
    out.push({ x: end.x + (next.x - end.x) * f * slop, y: end.y + (next.y - end.y) * f * slop });
  }
  return out;
}

/** Rounded-corner rectangle (Excalidraw's default edges) as one outline pass. */
function rectanglePass(x0: number, y0: number, x1: number, y1: number, width: number, slop: Sloppiness, rand: () => number): Point[] {
  const w = x1 - x0;
  const h = y1 - y0;
  const r = Math.min(32, Math.min(w, h) * 0.25);
  if (r < 2) return polygonPass([{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }], true, slop, rand);
  const corners = [
    { cx: x1 - r, cy: y0 + r, from: -Math.PI / 2 },
    { cx: x1 - r, cy: y1 - r, from: 0 },
    { cx: x0 + r, cy: y1 - r, from: Math.PI / 2 },
    { cx: x0 + r, cy: y0 + r, from: Math.PI },
  ];
  const arcSteps = Math.max(4, Math.ceil(r / 3));
  const out: Point[] = [];
  let prev: Point = { x: x0 + r, y: y0 };
  for (const c of corners) {
    const start = { x: c.cx + Math.cos(c.from) * r, y: c.cy + Math.sin(c.from) * r };
    const len = Math.hypot(start.x - prev.x, start.y - prev.y);
    const bow = slop === 0 ? 0 : (rand() * 2 - 1) * Math.min(len * 0.012 * slop, 1.4 * slop);
    out.push(...edge(prev, start, bow, rand, slop * 0.5));
    for (let i = 0; i < arcSteps; i += 1) {
      const a = c.from + (Math.PI / 2) * (i / arcSteps);
      out.push({ x: c.cx + Math.cos(a) * r, y: c.cy + Math.sin(a) * r });
    }
    prev = { x: c.cx + Math.cos(c.from + Math.PI / 2) * r, y: c.cy + Math.sin(c.from + Math.PI / 2) * r };
  }
  out.push(prev);
  if (slop > 0) {
    const reach = Math.min(w - 2 * r, 6 + width * 2) * (0.4 + rand() * 0.4) * slop;
    out.push({ x: prev.x + Math.max(0, reach), y: prev.y + (rand() * 2 - 1) * slop });
  }
  return out;
}

function ellipsePass(cx: number, cy: number, rx: number, ry: number, slop: Sloppiness, rand: () => number): Point[] {
  const start = slop === 0 ? -Math.PI / 2 : rand() * Math.PI * 2;
  // The wobble is a slow radial wave, so the outline stays smooth, and a loose
  // pass runs a little past its start instead of closing exactly.
  const amp = 0.012 * slop;
  const phase = rand() * Math.PI * 2;
  const sweep = Math.PI * 2 * (1 + 0.04 * slop);
  const steps = Math.ceil(ELLIPSE_SEGMENTS * (1 + 0.04 * slop));
  const out: Point[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const a = start + (sweep * i) / steps;
    const k = 1 + amp * Math.sin(2 * a + phase);
    out.push({ x: cx + Math.cos(a) * rx * k, y: cy + Math.sin(a) * ry * k });
  }
  return out;
}

function onePass(kind: ShapeKind, a: Point, b: Point, width: number, slop: Sloppiness, rand: () => number): Point[][] {
  const x0 = Math.min(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  switch (kind) {
    case "rectangle":
      return [rectanglePass(x0, y0, x1, y1, width, slop, rand)];
    case "diamond": {
      const mx = (x0 + x1) / 2;
      const my = (y0 + y1) / 2;
      return [polygonPass([{ x: mx, y: y0 }, { x: x1, y: my }, { x: mx, y: y1 }, { x: x0, y: my }], true, slop, rand)];
    }
    case "ellipse":
      return [ellipsePass((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2, slop, rand)];
    case "line":
      return [polygonPass([a, b], false, slop, rand)];
    case "arrow": {
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      const head = Math.min(len / 2.5, 14 + width * 2.5);
      const spread = Math.PI / 7;
      const left = { x: b.x - Math.cos(angle - spread) * head, y: b.y - Math.sin(angle - spread) * head };
      const right = { x: b.x - Math.cos(angle + spread) * head, y: b.y - Math.sin(angle + spread) * head };
      return [polygonPass([a, b], false, slop, rand), polygonPass([left, b, right], false, slop, rand)];
    }
  }
}

/**
 * Bake a dragged shape from `a` to `b` (board-space) into strokes ready to send.
 * An arrow is two strokes (shaft, head); a cartoonist shape is drawn twice with
 * a fresh wobble. `seed` fixes the wobble so the live preview and the committed
 * shape match. Returns [] for a click that never became a shape.
 */
export function shapeStrokes(kind: ShapeKind, a: Point, b: Point, style: ShapeStyle, slop: Sloppiness, seed: number): Stroke[] {
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  const tooSmall = kind === "line" || kind === "arrow" ? Math.hypot(dx, dy) < MIN_SIZE : dx < MIN_SIZE || dy < MIN_SIZE;
  if (tooSmall) return [];
  const rand = random(seed);
  const passes = slop === 2 ? 2 : 1;
  const out: Stroke[] = [];
  for (let p = 0; p < passes; p += 1) {
    for (const points of onePass(kind, a, b, style.width, slop, rand)) {
      out.push({ color: style.color, width: style.width, erase: false, ...(style.dash ? { dash: style.dash } : {}), points });
    }
  }
  return out;
}
