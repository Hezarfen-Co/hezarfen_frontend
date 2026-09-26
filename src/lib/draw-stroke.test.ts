import { describe, expect, it } from "vitest";
import { canvasPx, paintPaper, paintStroke, paintTip, parseScene, playableScene, sliceStrokes, strokesBounds, type DrawScene, type Stroke } from "./draw-stroke";

/** Records every 2d-context call so the three geometry branches can be asserted without a DOM. */
function stubContext() {
  const calls: string[] = [];
  const props: Record<string, unknown> = {};
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push(`${name}(${args.join(",")})`);
    };
  const c = {
    calls,
    props,
    beginPath: record("beginPath"),
    moveTo: record("moveTo"),
    lineTo: record("lineTo"),
    quadraticCurveTo: record("quadraticCurveTo"),
    arc: record("arc"),
    fill: record("fill"),
    stroke: record("stroke"),
    // a style setter, not geometry — kept out of `calls` like the other styles
    setLineDash: (segments: number[]) => {
      props.lineDash = segments;
    },
  };
  // trap the style assignments so composite mode / width can be asserted too
  return new Proxy(c, {
    set(target, key, value) {
      props[String(key)] = value;
      return Reflect.set(target, key, value);
    },
  }) as unknown as CanvasRenderingContext2D & { calls: string[]; props: Record<string, unknown> };
}

const stroke = (points: Stroke["points"], over: Partial<Stroke> = {}): Stroke => ({
  color: "#000",
  width: 4,
  erase: false,
  points,
  ...over,
});

describe("paintStroke", () => {
  it("draws nothing for an empty stroke", () => {
    const c = stubContext();
    paintStroke(c, stroke([]));
    expect(c.calls).toEqual([]);
  });

  it("fills a dot for a tap with no drag", () => {
    const c = stubContext();
    paintStroke(c, stroke([{ x: 10, y: 20 }]));
    // radius is half the line width, so a tap matches the pen it was drawn with
    expect(c.calls).toContain(`arc(10,20,2,0,${Math.PI * 2})`);
    expect(c.calls).toContain("fill()");
    expect(c.calls).not.toContain("stroke()");
  });

  it("smooths interior points into quadratics and lands on the last point", () => {
    const c = stubContext();
    paintStroke(
      c,
      stroke([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 10 },
        { x: 30, y: 10 },
      ]),
    );
    expect(c.calls).toEqual([
      "beginPath()",
      "moveTo(0,0)",
      "quadraticCurveTo(10,0,15,5)",
      "quadraticCurveTo(20,10,25,10)",
      "lineTo(30,10)",
      "stroke()",
    ]);
  });

  it("cuts through the layer when erasing instead of painting over it", () => {
    const c = stubContext();
    paintStroke(c, stroke([{ x: 1, y: 1 }, { x: 2, y: 2 }], { erase: true }));
    expect(c.props.globalCompositeOperation).toBe("destination-out");
  });

  it("draws a solid line unless the stroke carries a dash pattern", () => {
    const c = stubContext();
    paintStroke(c, stroke([{ x: 1, y: 1 }, { x: 2, y: 2 }]));
    expect(c.props.lineDash).toEqual([]);
    paintStroke(c, stroke([{ x: 1, y: 1 }, { x: 2, y: 2 }], { dash: "dashed" }));
    expect(c.props.lineDash).toEqual([16, 12]);
    paintStroke(c, stroke([{ x: 1, y: 1 }, { x: 2, y: 2 }], { dash: "dotted" }));
    expect((c.props.lineDash as number[])[0]).toBe(0);
  });

  it("paints over the layer when not erasing", () => {
    const c = stubContext();
    paintStroke(c, stroke([{ x: 1, y: 1 }, { x: 2, y: 2 }]));
    expect(c.props.globalCompositeOperation).toBe("source-over");
  });
});

describe("paintTip", () => {
  it("draws only the newest segment, not the whole stroke", () => {
    const c = stubContext();
    paintTip(
      c,
      stroke([
        { x: 0, y: 0 },
        { x: 5, y: 5 },
        { x: 9, y: 9 },
      ]),
    );
    expect(c.calls).toEqual(["beginPath()", "moveTo(5,5)", "lineTo(9,9)", "stroke()"]);
  });

  it("falls back to a dot on the first point of a stroke", () => {
    const c = stubContext();
    paintTip(c, stroke([{ x: 3, y: 4 }]));
    expect(c.calls).toContain("fill()");
  });
});

describe("parseScene", () => {
  const scene: DrawScene = { v: 1, w: 100, h: 80, strokes: [stroke([{ x: 1, y: 2 }, { x: 3, y: 4 }])] };

  it("parses a valid scene", () => {
    expect(parseScene(JSON.stringify(scene))).toEqual(scene);
  });

  it("keeps a known dash pattern and rejects an unknown one", () => {
    const dashed = { ...scene, strokes: [{ ...scene.strokes[0], dash: "dotted" }] };
    expect(parseScene(JSON.stringify(dashed))).toEqual(dashed);
    expect(parseScene(JSON.stringify({ ...scene, strokes: [{ ...scene.strokes[0], dash: "wavy" }] }))).toBeNull();
  });

  it("rejects a wrong version", () => {
    expect(parseScene(JSON.stringify({ ...scene, v: 2 }))).toBeNull();
  });

  // w/h size the playback canvas and drive paintPaper's per-cell loop, from a PNG anyone
  // can upload: a real export can be big, but never non-finite, negative or past MAX_SIDE.
  it("accepts a large-but-real box, rejects non-finite, non-positive and absurd sides", () => {
    expect(parseScene(JSON.stringify({ ...scene, w: 8000, h: 16384 }))).not.toBeNull();
    // 1e999 is valid JSON that parses to Infinity; null is what JSON.stringify makes of NaN.
    for (const bad of ["1e999", "-1", "0", "1e9", "null", '"10"']) {
      expect(parseScene(`{"v":1,"w":${bad},"h":10,"strokes":[]}`)).toBeNull();
    }
  });

  it("rejects a malformed stroke shape", () => {
    expect(parseScene(JSON.stringify({ v: 1, w: 1, h: 1, strokes: [{ color: "#000" }] }))).toBeNull();
  });

  it("rejects garbage and null", () => {
    expect(parseScene("not json")).toBeNull();
    expect(parseScene(null)).toBeNull();
  });

  // dpr multiplies the playback canvas allocation, from a PNG anyone can upload: it must
  // survive the round trip, stay optional for drawings saved before it existed, and never
  // arrive as something unusable or absurd.
  it("round-trips dpr, tolerates its absence, rejects bogus or out-of-range ones", () => {
    expect(parseScene(JSON.stringify({ ...scene, dpr: 2 }))?.dpr).toBe(2);
    expect(parseScene(JSON.stringify({ ...scene, dpr: 0.5 }))?.dpr).toBe(0.5); // zoomed-out export
    expect(parseScene(JSON.stringify(scene))?.dpr).toBeUndefined();
    expect(parseScene(JSON.stringify({ ...scene, dpr: 0 }))).toBeNull();
    expect(parseScene(JSON.stringify({ ...scene, dpr: "2" }))).toBeNull();
    expect(parseScene(JSON.stringify({ ...scene, dpr: 1e9 }))).toBeNull(); // tab-killer allocation
  });
});

describe("strokesBounds", () => {
  it("is null with nothing drawn", () => {
    expect(strokesBounds([])).toBeNull();
  });

  it("wraps every point and pads by half the stroke width", () => {
    const b = strokesBounds([
      stroke([{ x: 10, y: 10 }, { x: 30, y: 20 }], { width: 4 }), // half-width 2
      stroke([{ x: 50, y: 40 }], { width: 10 }), // half-width 5
    ]);
    // minX 10-2=8, minY 10-2=8, maxX 50+5=55, maxY 40+5=45
    expect(b).toEqual({ x: 8, y: 8, w: 47, h: 37 });
  });

  it("ignores eraser strokes so a far erase doesn't pad the export box", () => {
    const b = strokesBounds([
      stroke([{ x: 10, y: 10 }, { x: 30, y: 20 }], { width: 4 }), // pen, half-width 2
      stroke([{ x: 500, y: 500 }], { width: 10, erase: true }), // far eraser — must not count
    ]);
    // same box as the pen stroke alone: minX 10-2=8, minY 10-2=8, maxX 30+2=32, maxY 20+2=22
    expect(b).toEqual({ x: 8, y: 8, w: 24, h: 14 });
  });

  it("is null when the scene has only eraser strokes", () => {
    expect(strokesBounds([stroke([{ x: 5, y: 5 }], { erase: true })])).toBeNull();
  });
});

describe("sliceStrokes", () => {
  const a = stroke([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }]); // 3 points
  const b = stroke([{ x: 5, y: 5 }, { x: 6, y: 6 }, { x: 7, y: 7 }, { x: 8, y: 8 }]); // 4 points

  it("reveals nothing at count 0", () => {
    expect(sliceStrokes([a, b], 0)).toEqual({ full: [], partial: null });
  });

  it("reveals every stroke, no partial, at the total point count", () => {
    expect(sliceStrokes([a, b], 7)).toEqual({ full: [a, b], partial: null });
  });

  it("clamps past the total to the whole drawing", () => {
    expect(sliceStrokes([a, b], 999)).toEqual({ full: [a, b], partial: null });
  });

  it("truncates the stroke the cut lands inside", () => {
    const { full, partial } = sliceStrokes([a, b], 5); // a whole (3) + first 2 of b
    expect(full).toEqual([a]);
    expect(partial).toEqual({ ...b, points: b.points.slice(0, 2) });
  });

  it("gives no partial when the cut sits on a stroke boundary", () => {
    expect(sliceStrokes([a, b], 3)).toEqual({ full: [a], partial: null }); // a done, b not started
  });

  it("handles a single-point stroke on both sides of its one point", () => {
    const dot = stroke([{ x: 9, y: 9 }]);
    expect(sliceStrokes([dot], 0)).toEqual({ full: [], partial: null });
    expect(sliceStrokes([dot], 1)).toEqual({ full: [dot], partial: null });
  });

  it("is empty for no strokes", () => {
    expect(sliceStrokes([], 0)).toEqual({ full: [], partial: null });
    expect(sliceStrokes([], 5)).toEqual({ full: [], partial: null });
  });
});

describe("paintPaper", () => {
  it("draws nothing for none", () => {
    const c = stubContext();
    paintPaper(c, "none", 100, 100, 24);
    expect(c.calls).toEqual([]);
  });

  it("draws only horizontal rules for lines", () => {
    const c = stubContext();
    paintPaper(c, "lines", 100, 100, 24);
    const moves = c.calls.filter((s) => s.startsWith("moveTo"));
    expect(moves.length).toBeGreaterThan(0);
    // every rule starts at the left edge (x=0) — no vertical segments
    expect(moves.every((s) => s.startsWith("moveTo(0,"))).toBe(true);
    expect(c.calls).toContain("stroke()");
  });

  it("draws both horizontal and vertical lines for grid", () => {
    const c = stubContext();
    paintPaper(c, "grid", 100, 100, 24);
    const moves = c.calls.filter((s) => s.startsWith("moveTo"));
    const horizontal = moves.filter((s) => s.startsWith("moveTo(0,"));
    const vertical = moves.filter((s) => !s.startsWith("moveTo(0,"));
    expect(horizontal.length).toBeGreaterThan(0);
    expect(vertical.length).toBeGreaterThan(0);
  });
});

// canvasPx is the one spot both the export (draw-canvas's renderBounds) and playback
// (drawing-playback's onMount) canvases round a world-px side into device px — if the
// two ever computed this differently, the replay would render at a different on-screen
// size than the static <img> it swaps in for.
describe("canvasPx", () => {
  it("rounds world px * dpr to the nearest device px across export- and playback-typical dprs", () => {
    for (const side of [1, 16.5, 100.4, 123.7, 8000]) {
      for (const dpr of [0.5, 1, 2, 3]) {
        expect(canvasPx(side, dpr)).toBe(Math.max(1, Math.round(side * dpr)));
      }
    }
  });

  it("floors at 1 device px so a tiny side at a sub-1 dpr never yields a 0-sized canvas", () => {
    expect(canvasPx(0.5, 0.5)).toBe(1); // 0.25 rounds to 0, which a canvas can't allocate
  });

  // drawing-playback's onMount resolves `scene.dpr ?? window.devicePixelRatio` before
  // calling canvasPx — mirrored here since onMount itself needs a real DOM mount, which
  // this repo has no headless (jsdom-free) way to drive.
  it("mirrors the playback side's dpr fallback: a scene without dpr uses the viewer's ratio", () => {
    const viewerRatio = 3;
    const missingDpr: number | undefined = undefined;
    const savedDpr: number | undefined = 2;
    expect(canvasPx(100, missingDpr ?? viewerRatio)).toBe(canvasPx(100, viewerRatio));
    expect(canvasPx(100, savedDpr ?? viewerRatio)).toBe(canvasPx(100, 2)); // a saved dpr wins over the fallback
  });
});

describe("playableScene", () => {
  const scene: DrawScene = { v: 1, w: 10, h: 10, strokes: [stroke([{ x: 0, y: 0 }, { x: 1, y: 1 }])] };

  it("passes through a scene with at least one stroke — the playback branch", () => {
    expect(playableScene(scene)).toBe(scene);
  });

  it("is null for a scene with zero strokes — an emptied drawing falls back to the static image", () => {
    expect(playableScene({ ...scene, strokes: [] })).toBeNull();
  });

  it("is null for null — a plain photo with nothing embedded", () => {
    expect(playableScene(null)).toBeNull();
  });
});
