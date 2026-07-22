import { describe, expect, it } from "vitest";
import { paintPaper, paintStroke, paintTip, parseScene, sliceStrokes, strokesBounds, type DrawScene, type Stroke } from "./draw-stroke";

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

  it("rejects a wrong version", () => {
    expect(parseScene(JSON.stringify({ ...scene, v: 2 }))).toBeNull();
  });

  it("rejects a malformed stroke shape", () => {
    expect(parseScene(JSON.stringify({ v: 1, w: 1, h: 1, strokes: [{ color: "#000" }] }))).toBeNull();
  });

  it("rejects garbage and null", () => {
    expect(parseScene("not json")).toBeNull();
    expect(parseScene(null)).toBeNull();
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
