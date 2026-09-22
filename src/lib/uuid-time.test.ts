import { uuidV7Ms } from "./uuid-time";

describe("uuidV7Ms", () => {
  it("reads the unix-ms prefix of a v7 id", () => {
    expect(uuidV7Ms("01a0b1b0-aca9-7025-b739-d3ad153d617b")).toBe(0x01a0b1b0aca9);
  });

  it("orders ids created later after earlier ones", () => {
    expect(uuidV7Ms("01a0b1b0-aca9-7025-b739-d3ad153d617b")!).toBeLessThan(uuidV7Ms("01a0b1b1-0000-7000-8000-000000000000")!);
  });

  it("returns null for a non-v7 id", () => {
    expect(uuidV7Ms("123e4567-e89b-42d3-a456-426614174000")).toBeNull();
    expect(uuidV7Ms("not-an-id")).toBeNull();
  });
});
