/**
 * PNG `tEXt`-chunk metadata: embed/read a keyword→text pair inside a valid PNG.
 * Pure `Uint8Array` in/out, no DOM — this is the ".excalidraw.png" trick that lets
 * the editable stroke JSON ride inside the same bytes that display as a normal image.
 */

const SIGNATURE_LENGTH = 8;
const TEXT_TYPE = new Uint8Array([0x74, 0x45, 0x58, 0x74]); // "tEXt"

/** Standard PNG/zlib CRC-32 (polynomial 0xEDB88320), computed on the fly. */
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

function writeUint32(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

/** Byte offset just past the IHDR chunk — the spec-legal spot to insert new chunks. */
function afterIhdr(png: Uint8Array): number {
  // signature(8) + length(4) + type(4) + IHDR data(length) + crc(4)
  return SIGNATURE_LENGTH + 4 + 4 + readUint32(png, SIGNATURE_LENGTH) + 4;
}

/** Return a new PNG with a `tEXt` chunk carrying `keyword`→`text` inserted after IHDR. */
export function embedPngText(png: Uint8Array, keyword: string, text: string): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder();
  const keyBytes = enc.encode(keyword);
  const textBytes = enc.encode(text);

  const data = new Uint8Array(keyBytes.length + 1 + textBytes.length);
  data.set(keyBytes, 0);
  data[keyBytes.length] = 0; // null separator between keyword and text
  data.set(textBytes, keyBytes.length + 1);

  // CRC covers the chunk type followed by its data.
  const typeAndData = new Uint8Array(TEXT_TYPE.length + data.length);
  typeAndData.set(TEXT_TYPE, 0);
  typeAndData.set(data, TEXT_TYPE.length);

  const chunk = new Uint8Array(4 + 4 + data.length + 4);
  writeUint32(chunk, 0, data.length);
  chunk.set(TEXT_TYPE, 4);
  chunk.set(data, 8);
  writeUint32(chunk, 8 + data.length, crc32(typeAndData));

  const at = afterIhdr(png);
  const out = new Uint8Array(png.length + chunk.length);
  out.set(png.subarray(0, at), 0);
  out.set(chunk, at);
  out.set(png.subarray(at), at + chunk.length);
  return out;
}

/** Read the text of the first `tEXt` chunk with `keyword`, or null if absent. */
export function extractPngText(png: Uint8Array, keyword: string): string | null {
  const dec = new TextDecoder();
  let offset = SIGNATURE_LENGTH;
  while (offset + 8 <= png.length) {
    const length = readUint32(png, offset);
    const type = String.fromCharCode(png[offset + 4], png[offset + 5], png[offset + 6], png[offset + 7]);
    const dataStart = offset + 8;
    if (type === "tEXt") {
      const data = png.subarray(dataStart, dataStart + length);
      const nul = data.indexOf(0);
      if (nul !== -1 && dec.decode(data.subarray(0, nul)) === keyword) {
        return dec.decode(data.subarray(nul + 1));
      }
    }
    if (type === "IEND") break;
    offset = dataStart + length + 4; // skip data + crc
  }
  return null;
}
