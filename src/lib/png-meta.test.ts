import { describe, expect, it } from "vitest";
import type { DrawScene } from "./draw-stroke";
import { embedPngText, extractPngText } from "./png-meta";

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Structurally valid (chunk-walkable) 1x1 PNG: signature + IHDR + IEND. CRCs are zeroed — embed/extract never validate them. */
function minimalPng(): Uint8Array {
  const ihdrData = [0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]; // 1x1, 8-bit, RGBA
  return new Uint8Array([
    ...SIGNATURE,
    0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, ...ihdrData, 0, 0, 0, 0, // IHDR
    0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0, 0, 0, 0, // IEND
  ]);
}

/** Reference CRC-32, pinned below to the spec's known IEND constant so it can vouch for embed's CRC. */
function refCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const ascii = (s: string) => new Uint8Array([...s].map((c) => c.charCodeAt(0)));

describe("png-meta", () => {
  it("round-trips embed -> extract", () => {
    const png = embedPngText(minimalPng(), "hezarfen-drawing", '{"v":1}');
    expect(extractPngText(png, "hezarfen-drawing")).toBe('{"v":1}');
  });

  it("returns null for a wrong keyword", () => {
    const png = embedPngText(minimalPng(), "hezarfen-drawing", "payload");
    expect(extractPngText(png, "other")).toBeNull();
  });

  it("returns null when no tEXt chunk is present", () => {
    expect(extractPngText(minimalPng(), "hezarfen-drawing")).toBeNull();
  });

  it("inserts the tEXt chunk right after IHDR", () => {
    const png = embedPngText(minimalPng(), "k", "v");
    // signature(8) + IHDR chunk(4+4+13+4 = 25) => next chunk type starts at 33+4.
    const type = String.fromCharCode(png[37], png[38], png[39], png[40]);
    expect(type).toBe("tEXt");
  });

  it("writes a spec-correct CRC over chunk type + data", () => {
    // Anchor the reference implementation to the spec's fixed IEND CRC.
    expect(refCrc32(ascii("IEND"))).toBe(0xae426082);

    const png = embedPngText(minimalPng(), "kw", "hi");
    // tEXt data = "kw" + NUL + "hi" (5 bytes); length field sits at offset 33.
    const dataLen = ((png[33] << 24) | (png[34] << 16) | (png[35] << 8) | png[36]) >>> 0;
    expect(dataLen).toBe(5);
    const typeAndData = png.subarray(37, 37 + 4 + dataLen); // "tEXt" + data
    const crcAt = 37 + 4 + dataLen;
    const embedded = ((png[crcAt] << 24) | (png[crcAt + 1] << 16) | (png[crcAt + 2] << 8) | png[crcAt + 3]) >>> 0;
    expect(embedded).toBe(refCrc32(typeAndData));
  });

  it("round-trips a full drawing scene's JSON — strokes, points, colour, width, erase, bg, w/h, dpr — byte-for-byte", () => {
    const scene: DrawScene = {
      v: 1,
      w: 120,
      h: 80,
      bg: "grid",
      dpr: 2,
      strokes: [
        { color: "#1f2937", width: 6, erase: false, points: [{ x: 1, y: 2 }, { x: 3.5, y: 4 }] },
        { color: "#dc2626", width: 14, erase: true, points: [{ x: 10, y: 10 }] },
      ],
    };
    const json = JSON.stringify(scene);
    const png = embedPngText(minimalPng(), "hezarfen-drawing", json);
    expect(extractPngText(png, "hezarfen-drawing")).toBe(json);
    expect(JSON.parse(extractPngText(png, "hezarfen-drawing")!)).toEqual(scene);
  });
});
