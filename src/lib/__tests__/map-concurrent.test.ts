import { mapConcurrent } from "@/lib/map-concurrent";

describe("mapConcurrent", () => {
  it("keeps input order", async () => {
    const out = await mapConcurrent([30, 10, 20], 2, async (ms, index) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      return index;
    });
    expect(out).toEqual([0, 1, 2]);
  });

  it("never runs more than `limit` calls at once", async () => {
    let active = 0;
    let peak = 0;
    await mapConcurrent(Array.from({ length: 20 }, (_, i) => i), 3, async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active -= 1;
    });
    expect(peak).toBe(3);
  });

  it("returns an empty array for no items", async () => {
    expect(await mapConcurrent([], 4, async () => 1)).toEqual([]);
  });

  it("rejects when a call rejects", async () => {
    await expect(mapConcurrent([1, 2], 2, async (n) => {
      if (n === 2) throw new Error("boom");
      return n;
    })).rejects.toThrow("boom");
  });
});
