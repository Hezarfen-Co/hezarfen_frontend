import { describe, expect, it } from "vitest";
import { compactChoices, planChoiceImageRestore } from "./choice-compaction";

const meta = { content_type: "image/png", size: 1 };
const noImages = (n: number) => Array.from({ length: n }, () => null);

describe("compactChoices", () => {
  it("keeps the answer on the same choice when a choice above it is blanked", () => {
    // A B C D with D marked correct; the user blanks B.
    const result = compactChoices(["A", "", "C", "D"], noImages(4), [0, 1, 2, 3], 3);
    expect(result.choices).toEqual(["A", "C", "D"]);
    expect(result.sources).toEqual([0, 2, 3]);
    expect(result.correct).toBe(2);
    expect(result.choices[result.correct]).toBe("D"); // same text the user picked
  });

  it("rejects the edit when the choice marked correct is the blanked one", () => {
    const result = compactChoices(["A", "", "C"], noImages(3), [0, 1, 2], 1);
    expect(result.correct).toBe(-1);
  });

  it("resolves an answer marked on a newly added row", () => {
    // D was added in this edit (source -1) and marked correct; B was blanked.
    const result = compactChoices(["A", "", "C", "D"], noImages(4), [0, 1, 2, -1], 3);
    expect(result.correct).toBe(2);
    expect(result.sources).toEqual([0, 2, -1]);
  });

  it("carries picked files with their choice and trims text", () => {
    const file = new File([], "c.png");
    const result = compactChoices(["A", "  ", " C "], [null, file, file], [0, 1, 2], 2);
    expect(result.choices).toEqual(["A", "C"]);
    expect(result.images).toEqual([null, file]);
    expect(result.correct).toBe(1);
  });
});

describe("planChoiceImageRestore", () => {
  it("restores to the post-compaction slot, not the original index", () => {
    // A, B, C all had images; the user blanked B, so C survives as index 1.
    const plan = planChoiceImageRestore([0, 2], [meta, meta, meta], null);
    expect(plan).toEqual([
      { index: 0, source: 0 },
      { index: 1, source: 2 },
    ]);
    // never plans an index past the choices that survived
    expect(plan.every((slot) => slot.index < 2)).toBe(true);
  });

  it("skips new choices, imageless options, and options the user replaced", () => {
    const replacements = [null, new File([], "b.png"), null];
    expect(planChoiceImageRestore([0, 1, -1], [meta, meta, null], replacements)).toEqual([
      { index: 0, source: 0 },
    ]);
    expect(planChoiceImageRestore([0, 1], [null, null], null)).toEqual([]);
  });
});
