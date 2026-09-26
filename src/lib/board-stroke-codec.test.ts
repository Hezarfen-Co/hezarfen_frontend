import { describe, expect, it } from "vitest";
import {
  decodeSegment,
  encodeEraseMarkers,
  encodeStrokeSegments,
  reassembleStrokes,
  segmentToStroke,
} from "./board-stroke-codec";
import type { Stroke } from "./draw-stroke";

function makeStroke(pointCount: number): Stroke {
  const points = Array.from({ length: pointCount }, (_, i) => ({ x: i * 1.234, y: i * 5.678 }));
  return { color: "#ff0000", width: 3, erase: false, points };
}

describe("board-stroke-codec", () => {
  it("encodes a short stroke into a single segment", () => {
    const payloads = encodeStrokeSegments(makeStroke(5), "s1");
    expect(payloads).toHaveLength(1);
    const seg = decodeSegment(payloads[0]);
    expect(seg).not.toBeNull();
    expect(seg?.sid).toBe("s1");
    expect(seg?.seg).toBe(0);
    expect(seg?.last).toBe(true);
    expect(seg?.pts).toHaveLength(5);
  });

  it("returns no segments for an empty stroke", () => {
    expect(encodeStrokeSegments(makeStroke(0), "s1")).toEqual([]);
  });

  it("splits a long stroke into multiple capped segments", () => {
    const payloads = encodeStrokeSegments(makeStroke(2000), "s2", 512);
    expect(payloads.length).toBeGreaterThan(1);
    for (const p of payloads) {
      expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(512);
    }
    // exactly one final segment
    const lasts = payloads.map((p) => decodeSegment(p)!.last).filter(Boolean);
    expect(lasts).toHaveLength(1);
    expect(decodeSegment(payloads[payloads.length - 1])!.last).toBe(true);
  });

  it("reassembles segments back into the original stroke (no duplicate overlap points)", () => {
    const original = makeStroke(2000);
    const payloads = encodeStrokeSegments(original, "s3", 512);
    const [rebuilt] = reassembleStrokes(payloads);
    expect(rebuilt.points).toHaveLength(original.points.length);
    expect(rebuilt.color).toBe(original.color);
    expect(rebuilt.width).toBe(original.width);
    // rounded to 2dp, so compare with tolerance
    expect(rebuilt.points[0].x).toBeCloseTo(original.points[0].x, 2);
    expect(rebuilt.points[1999].y).toBeCloseTo(original.points[1999].y, 2);
  });

  it("keeps distinct sids as distinct strokes, in order", () => {
    const a = encodeStrokeSegments({ ...makeStroke(3), color: "#111111" }, "a");
    const b = encodeStrokeSegments({ ...makeStroke(3), color: "#222222" }, "b");
    const strokes = reassembleStrokes([...a, ...b]);
    expect(strokes).toHaveLength(2);
    expect(strokes[0].color).toBe("#111111");
    expect(strokes[1].color).toBe("#222222");
  });

  it("segmentToStroke paints a single segment's own points", () => {
    const [payload] = encodeStrokeSegments(makeStroke(4), "s4");
    const stroke = segmentToStroke(decodeSegment(payload)!);
    expect(stroke.points).toHaveLength(4);
    expect(stroke.erase).toBe(false);
  });

  it("decodeSegment rejects malformed payloads", () => {
    expect(decodeSegment(null)).toBeNull();
    expect(decodeSegment("not json")).toBeNull();
    expect(decodeSegment(JSON.stringify({ v: 2, sid: "x" }))).toBeNull();
    expect(decodeSegment(JSON.stringify({ v: 1, sid: "x", seg: 0, last: true, color: "#000000", width: 1, erase: false, pts: [[1]] }))).toBeNull();
  });

  it("skips non-stroke rows during reassembly", () => {
    const good = encodeStrokeSegments(makeStroke(2), "g");
    const strokes = reassembleStrokes([null, "garbage", ...good]);
    expect(strokes).toHaveLength(1);
  });

  it("round-trips a dash pattern and leaves a solid payload without one", () => {
    const dashed = { ...makeStroke(300), dash: "dashed" as const };
    const payloads = encodeStrokeSegments(dashed, "d", 512);
    expect(payloads.length).toBeGreaterThan(1);
    expect(payloads.every((p) => decodeSegment(p)?.dash === "dashed")).toBe(true);
    expect(reassembleStrokes(payloads)[0].dash).toBe("dashed");
    expect(segmentToStroke(decodeSegment(payloads[0])!).dash).toBe("dashed");
    expect(encodeStrokeSegments(makeStroke(2), "s")[0]).not.toContain("dash");
  });

  it("rejects an unknown dash pattern", () => {
    const payload = JSON.parse(encodeStrokeSegments(makeStroke(2), "x")[0]);
    expect(decodeSegment(JSON.stringify({ ...payload, dash: "wavy" }))).toBeNull();
  });

  it("encodes an erase as ink-free markers split under the cap", () => {
    const ids = Array.from({ length: 60 }, (_, i) => `user-${i}-1700000000000-${i}`);
    const payloads = encodeEraseMarkers(ids, "e", 512);
    expect(payloads.length).toBeGreaterThan(1);
    const all: string[] = [];
    for (const p of payloads) {
      expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(512);
      const seg = decodeSegment(p)!;
      expect(seg.pts).toEqual([]);
      all.push(...seg.del!);
    }
    expect(all).toEqual(ids);
  });

  it("drops erased strokes from a reassembled history", () => {
    const keep = encodeStrokeSegments(makeStroke(3), "keep");
    const gone = encodeStrokeSegments(makeStroke(300), "gone", 512);
    const strokes = reassembleStrokes([...gone, ...keep, ...encodeEraseMarkers(["gone"], "e")]);
    expect(strokes).toHaveLength(1);
    expect(strokes[0].points).toHaveLength(3);
  });

  it("rejects a marker whose del list is not strings", () => {
    const payload = JSON.parse(encodeEraseMarkers(["a"], "e")[0]);
    expect(decodeSegment(JSON.stringify({ ...payload, del: [1] }))).toBeNull();
  });
});
