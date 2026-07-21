export type Point = { x: number; y: number };
export type Stroke = { color: string; width: number; erase: boolean; points: Point[] };
export type DrawScene = { v: 1; w: number; h: number; strokes: Stroke[] };

function isPoint(p: unknown): p is Point {
  return !!p && typeof p === "object" && typeof (p as Point).x === "number" && typeof (p as Point).y === "number";
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
  if (scene.v !== 1 || typeof scene.w !== "number" || typeof scene.h !== "number" || !Array.isArray(scene.strokes)) {
    return null;
  }
  if (!scene.strokes.every(isStroke)) return null;
  return scene;
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
