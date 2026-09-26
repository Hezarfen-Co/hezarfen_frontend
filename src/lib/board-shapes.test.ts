import { describe, expect, it } from "vitest";
import { constrainEnd, shapeStrokes, type ShapeKind } from "./board-shapes";
import { strokesBounds } from "./draw-stroke";

const style = { color: "#1e1e1e", width: 2 };
const a = { x: 10, y: 20 };
const b = { x: 210, y: 120 };

describe("board-shapes", () => {
  it("returns nothing for a click that never became a shape", () => {
    for (const kind of ["rectangle", "diamond", "ellipse", "line", "arrow"] as ShapeKind[]) {
      expect(shapeStrokes(kind, a, { x: 11, y: 20.5 }, style, 1, 7)).toEqual([]);
    }
  });

  it("keeps a clean rectangle inside its dragged box", () => {
    const strokes = shapeStrokes("rectangle", a, b, style, 0, 1);
    expect(strokes).toHaveLength(1);
    const box = strokesBounds(strokes)!;
    expect(box.x).toBeCloseTo(a.x - 1, 5);
    expect(box.y).toBeCloseTo(a.y - 1, 5);
    expect(box.w).toBeCloseTo(b.x - a.x + 2, 5);
    expect(box.h).toBeCloseTo(b.y - a.y + 2, 5);
  });

  it("draws a sloppy shape close to, not exactly on, its box", () => {
    const box = strokesBounds(shapeStrokes("diamond", a, b, style, 1, 3))!;
    expect(Math.abs(box.x - (a.x - 1))).toBeLessThan(6);
    expect(Math.abs(box.w - (b.x - a.x + 2))).toBeLessThan(12);
  });

  it("is deterministic for a seed and varies across seeds", () => {
    const one = shapeStrokes("ellipse", a, b, style, 1, 42);
    expect(shapeStrokes("ellipse", a, b, style, 1, 42)).toEqual(one);
    expect(shapeStrokes("ellipse", a, b, style, 1, 43)).not.toEqual(one);
  });

  it("splits an arrow into shaft and head, and doubles a cartoonist pass", () => {
    expect(shapeStrokes("arrow", a, b, style, 0, 1)).toHaveLength(2);
    expect(shapeStrokes("arrow", a, b, style, 2, 1)).toHaveLength(4);
    expect(shapeStrokes("rectangle", a, b, style, 2, 1)).toHaveLength(2);
  });

  it("ends a clean arrow's shaft and head on the tip", () => {
    const [shaft, head] = shapeStrokes("arrow", a, b, style, 0, 1);
    expect(shaft.points[0]).toEqual(a);
    expect(shaft.points[shaft.points.length - 1]).toEqual(b);
    expect(head.points).toContainEqual(b);
  });

  it("carries the dash pattern onto every stroke", () => {
    for (const s of shapeStrokes("arrow", a, b, { ...style, dash: "dotted" }, 1, 1)) {
      expect(s.dash).toBe("dotted");
      expect(s.erase).toBe(false);
    }
    expect("dash" in shapeStrokes("line", a, b, style, 0, 1)[0]).toBe(false);
  });

  it("constrains a box to a square and a line to 45° steps", () => {
    expect(constrainEnd("rectangle", { x: 0, y: 0 }, { x: -30, y: 10 })).toEqual({ x: -30, y: 30 });
    const end = constrainEnd("line", { x: 0, y: 0 }, { x: 100, y: 10 });
    expect(end.x).toBeCloseTo(Math.hypot(100, 10), 5);
    expect(end.y).toBeCloseTo(0, 5);
  });
});
