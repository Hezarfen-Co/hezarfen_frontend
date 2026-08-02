import type { Point, Stroke } from "./draw-stroke";

// The whiteboard backend caps each stroke `payload` at 4096 bytes
// (board.max_stroke_payload_len, published at GET /limits). A long freehand
// stroke is split into several segment frames that share one `sid`; the
// receiver paints each segment as it arrives (consecutive segments overlap by
// one point so the line stays continuous) and can reassemble the full stroke
// for history replay.
export const MAX_STROKE_PAYLOAD_BYTES = 4096;

// A little headroom under the hard cap so we never sit exactly on the byte
// boundary the server rejects.
const DEFAULT_MAX_BYTES = MAX_STROKE_PAYLOAD_BYTES - 64;

// Wire envelope for one segment of a logical stroke. Coordinates are
// board-space (device/zoom independent); points travel as [x, y] tuples to
// keep the payload small.
export type StrokeSegment = {
  v: 1;
  sid: string;
  seg: number;
  last: boolean;
  color: string;
  width: number;
  erase: boolean;
  pts: [number, number][];
};

const encoder = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;

function byteLength(text: string): number {
  return encoder ? encoder.encode(text).length : text.length;
}

// Board-space may be fractional; two decimals is plenty of fidelity and keeps
// the payload compact.
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function segmentString(
  sid: string,
  seg: number,
  last: boolean,
  stroke: Pick<Stroke, "color" | "width" | "erase">,
  pts: [number, number][],
): string {
  const envelope: StrokeSegment = {
    v: 1,
    sid,
    seg,
    last,
    color: stroke.color,
    width: stroke.width,
    erase: stroke.erase,
    pts,
  };
  return JSON.stringify(envelope);
}

/**
 * Serialize one logical stroke into one or more segment payloads, each under
 * `maxBytes`. Consecutive segments repeat the previous segment's last point as
 * their first, so painting them in order leaves no gap. A single point whose
 * envelope already exceeds the cap is still emitted (a point can't be split).
 */
export function encodeStrokeSegments(
  stroke: Stroke,
  sid: string,
  maxBytes: number = DEFAULT_MAX_BYTES,
): string[] {
  const tuples: [number, number][] = stroke.points.map((p) => [round2(p.x), round2(p.y)]);
  if (tuples.length === 0) return [];

  const segments: [number, number][][] = [];
  let current: [number, number][] = [];

  for (const pt of tuples) {
    const candidate = [...current, pt];
    // Not the last segment yet (last flag unknown here), so measure with
    // last:false — the final re-encode below stamps the real flags.
    const fits = byteLength(segmentString(sid, segments.length, false, stroke, candidate)) <= maxBytes;
    if (fits || current.length === 0) {
      current = candidate;
    } else {
      segments.push(current);
      // Overlap one point for continuity across the segment boundary.
      current = [current[current.length - 1], pt];
    }
  }
  if (current.length > 0) segments.push(current);

  return segments.map((pts, i) =>
    segmentString(sid, i, i === segments.length - 1, stroke, pts),
  );
}

function isTuple(v: unknown): v is [number, number] {
  return (
    Array.isArray(v) &&
    v.length === 2 &&
    typeof v[0] === "number" &&
    typeof v[1] === "number" &&
    Number.isFinite(v[0]) &&
    Number.isFinite(v[1])
  );
}

/** Parse one segment payload, or null on anything malformed (payloads are untrusted). */
export function decodeSegment(payload: string | null): StrokeSegment | null {
  if (!payload) return null;
  let data: unknown;
  try {
    data = JSON.parse(payload);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const s = data as StrokeSegment;
  if (
    s.v !== 1 ||
    typeof s.sid !== "string" ||
    typeof s.seg !== "number" ||
    typeof s.last !== "boolean" ||
    typeof s.color !== "string" ||
    typeof s.width !== "number" ||
    typeof s.erase !== "boolean" ||
    !Array.isArray(s.pts) ||
    !s.pts.every(isTuple)
  ) {
    return null;
  }
  return s;
}

/** One decoded segment as a paintable Stroke (its own points only). */
export function segmentToStroke(seg: StrokeSegment): Stroke {
  return {
    color: seg.color,
    width: seg.width,
    erase: seg.erase,
    points: seg.pts.map(([x, y]) => ({ x, y }) as Point),
  };
}

/**
 * Reassemble full strokes from an ordered list of stroke payloads (e.g. a
 * history/epoch page). Segments are grouped by `sid` in arrival order; the
 * overlap point each later segment repeats is dropped so the joined stroke has
 * no duplicate vertex. Non-stroke rows (null payloads, clear markers) are
 * skipped by the caller passing only stroke payloads.
 */
export function reassembleStrokes(payloads: (string | null)[]): Stroke[] {
  const order: string[] = [];
  const bySid = new Map<string, Stroke>();

  for (const payload of payloads) {
    const seg = decodeSegment(payload);
    if (!seg) continue;
    const pts = seg.pts.map(([x, y]) => ({ x, y }) as Point);
    const existing = bySid.get(seg.sid);
    if (!existing) {
      order.push(seg.sid);
      bySid.set(seg.sid, { color: seg.color, width: seg.width, erase: seg.erase, points: pts });
    } else {
      // Drop the leading overlap point that duplicates the previous last point.
      existing.points.push(...(seg.seg > 0 ? pts.slice(1) : pts));
    }
  }

  return order.map((sid) => bySid.get(sid)!);
}
