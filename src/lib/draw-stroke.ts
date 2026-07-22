export type Point = { x: number; y: number };
export type Stroke = { color: string; width: number; erase: boolean; points: Point[] };
export type BgKind = "none" | "lines" | "grid";
/** `w`/`h` are DPR-free world px; `dpr` is the device ratio the PNG beside them was baked at. */
export type DrawScene = { v: 1; w: number; h: number; strokes: Stroke[]; bg?: BgKind; dpr?: number };

/** World px per notebook cell — shared by the live CSS paper and the baked export so both read as the same ruling. */
export const PAPER_CELL = 24;
/** Faint blue-gray ruling colour for both the live CSS paper and the baked export. */
export const PAPER_LINE = "rgba(37, 99, 235, 0.14)";

function isPoint(p: unknown): p is Point {
  return !!p && typeof p === "object" && typeof (p as Point).x === "number" && typeof (p as Point).y === "number";
}

/**
 * Export-box side in world px: finite, positive, and no wider than the largest canvas a
 * browser will make. A real export was itself rendered through a `w × dpr` canvas (dpr ≥ 1
 * on any normal display), so nothing legitimate can exceed this — while an unbounded side
 * both sizes the playback allocation and drives paintPaper's per-cell loop.
 */
const MAX_SIDE = 16384;

function isSide(n: unknown): n is number {
  return typeof n === "number" && n > 0 && n <= MAX_SIDE; // NaN/Infinity fail the comparisons
}

function isStroke(s: unknown): s is Stroke {
  if (!s || typeof s !== "object") return false;
  const st = s as Stroke;
  return (
    typeof st.color === "string" &&
    typeof st.width === "number" &&
    typeof st.erase === "boolean" &&
    Array.isArray(st.points) &&
    st.points.every(isPoint)
  );
}

/**
 * Parse the JSON embedded in a drawing PNG into a scene, or null on anything
 * malformed. The input is effectively untrusted (any uploaded `.hzdraw.png`),
 * so the whole shape is validated before it reaches the renderer.
 */
export function parseScene(text: string | null): DrawScene | null {
  if (!text) return null;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const scene = data as DrawScene;
  if (scene.v !== 1 || !isSide(scene.w) || !isSide(scene.h) || !Array.isArray(scene.strokes)) {
    return null;
  }
  if (!scene.strokes.every(isStroke)) return null;
  // bg is optional (old drawings lack it); reject only a present-but-bogus value.
  if (scene.bg !== undefined && scene.bg !== "none" && scene.bg !== "lines" && scene.bg !== "grid") return null;
  // dpr likewise optional, but it multiplies a canvas allocation on the viewer's machine, so
  // cap it at 8 — well past any real display (1–3), while browser zoom-out legitimately
  // exports below 1. NaN/Infinity fail the comparisons.
  if (scene.dpr !== undefined && !(typeof scene.dpr === "number" && scene.dpr > 0 && scene.dpr <= 8)) return null;
  return scene;
}

/**
 * A parsed scene is only worth replaying if it has ink: a plain photo (parse failed,
 * null) or an emptied drawing (parsed, zero strokes) both mean "nothing to play", so
 * ReplayableImage falls back to the static image for either. Pulled out of that
 * component (which has three call sites of its own) so the decision is unit-testable
 * without mounting Solid.
 */
export function playableScene(parsed: DrawScene | null): DrawScene | null {
  return parsed && parsed.strokes.length > 0 ? parsed : null;
}

/**
 * Tight bounding box over every ink (pen) stroke, padded by its half-width so a
 * thick line isn't clipped at the edge. Null when there's nothing drawn. Used to
 * export only the drawn region of an unbounded (pannable) pad instead of the
 * viewport.
 */
export function strokesBounds(strokes: Stroke[]): { x: number; y: number; w: number; h: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of strokes) {
    if (s.erase) continue; // eraser cuts existing ink, adds none — must not expand the export box
    const r = s.width / 2;
    for (const p of s.points) {
      minX = Math.min(minX, p.x - r);
      minY = Math.min(minY, p.y - r);
      maxX = Math.max(maxX, p.x + r);
      maxY = Math.max(maxY, p.y + r);
    }
  }
  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/**
 * World px → device px for one canvas side, shared by the export (`renderBounds`,
 * baking `scene.w`/`scene.h` at `scene.dpr`) and playback (`onMount`, replaying them at
 * that same dpr) so the two can't round differently and size the replay canvas
 * differently on screen than the static image it replaces. Floors at 1: a canvas side
 * of 0 throws, which a tiny world side at a sub-1 dpr could otherwise round down to.
 */
export function canvasPx(worldSide: number, dpr: number): number {
  return Math.max(1, Math.round(worldSide * dpr));
}

/**
 * Split strokes at a reveal cut for order-only playback. Points are counted across
 * strokes in drawn order; the first `revealCount` are "revealed". `full` = strokes
 * shown in their entirety, `partial` = the stroke the cut lands inside, truncated to
 * its revealed points (null when the cut sits on a stroke boundary). `revealCount` is
 * clamped to [0, total points]; running out of strokes handles the upper bound.
 */
export function sliceStrokes(strokes: Stroke[], revealCount: number): { full: Stroke[]; partial: Stroke | null } {
  let n = Math.max(0, Math.floor(revealCount));
  const full: Stroke[] = [];
  for (const s of strokes) {
    if (n >= s.points.length) {
      full.push(s);
      n -= s.points.length;
      continue;
    }
    // cut lands inside this stroke (0 <= n < points.length); n === 0 means it hasn't started
    return { full, partial: n > 0 ? { ...s, points: s.points.slice(0, n) } : null };
  }
  return { full, partial: null };
}

function applyBrush(c: CanvasRenderingContext2D, stroke: Stroke) {
  // The eraser cuts through the transparent drawing layer rather than painting
  // over it, so a saved drawing keeps whatever the caller flattens it onto.
  c.globalCompositeOperation = stroke.erase ? "destination-out" : "source-over";
  c.strokeStyle = stroke.color;
  c.fillStyle = stroke.color;
  c.lineWidth = stroke.width;
  c.lineCap = "round";
  c.lineJoin = "round";
}

/** Replay a finished stroke. Midpoint quadratics so a fast drag reads as a curve, not a polygon. */
export function paintStroke(c: CanvasRenderingContext2D, stroke: Stroke) {
  const pts = stroke.points;
  if (pts.length === 0) return;
  applyBrush(c, stroke);
  if (pts.length === 1) {
    // a tap with no drag still leaves a dot
    c.beginPath();
    c.arc(pts[0].x, pts[0].y, stroke.width / 2, 0, Math.PI * 2);
    c.fill();
    return;
  }
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i += 1) {
    c.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2);
  }
  c.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  c.stroke();
}

/**
 * Paint only the newest segment of a stroke still being drawn. Replaying the
 * whole drawing on every pointermove gets expensive past a few thousand points;
 * the caller replays once on pointerup to swap in the smoothed version.
 */
export function paintTip(c: CanvasRenderingContext2D, stroke: Stroke) {
  const pts = stroke.points;
  if (pts.length < 2) {
    paintStroke(c, stroke);
    return;
  }
  applyBrush(c, stroke);
  c.beginPath();
  c.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
  c.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  c.stroke();
}

/**
 * Paint ruled/grid paper across a device-pixel box, meant to sit UNDER the
 * strokes. `step` is line spacing in device px. No-op for "none". Kept out of the
 * live redraw() on purpose: the eraser (destination-out) would cut these lines, so
 * the live pad rules itself with CSS and this only bakes the exported image.
 */
export function paintPaper(c: CanvasRenderingContext2D, bg: BgKind, width: number, height: number, step: number) {
  if (bg === "none" || step <= 0) return;
  c.strokeStyle = PAPER_LINE;
  c.lineWidth = 1;
  c.beginPath();
  for (let y = step; y < height; y += step) {
    c.moveTo(0, y);
    c.lineTo(width, y);
  }
  if (bg === "grid") {
    for (let x = step; x < width; x += step) {
      c.moveTo(x, 0);
      c.lineTo(x, height);
    }
  }
  c.stroke();
}
