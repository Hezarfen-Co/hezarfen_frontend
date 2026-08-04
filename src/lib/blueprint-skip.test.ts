import { describe, expect, it } from "vitest";
import { skipReasonCopy } from "./blueprint-skip";

describe("skipReasonCopy", () => {
  it("maps the fixed reasons", () => {
    expect(skipReasonCopy("the class is already at its course ceiling", "Algebra").key).toBe(
      "classBlueprints.skipCeiling",
    );
    expect(
      skipReasonCopy("The class was deleted while the blueprint was being applied.", "Algebra").key,
    ).toBe("classBlueprints.skipClassGone");
  });

  it("survives the punctuation and casing normalization", () => {
    expect(skipReasonCopy("  THE CLASS IS ALREADY AT ITS COURSE CEILING!  ", "x").key).toBe(
      "classBlueprints.skipCeiling",
    );
  });

  it("re-parameterizes the course-named reasons with the resolved title", () => {
    const seat = skipReasonCopy("Algebra II has no free seat for the whole class", "Cebir II");
    expect(seat.key).toBe("classBlueprints.skipNoSeat");
    expect(seat.vars).toEqual({ course: "Cebir II" });

    const gone = skipReasonCopy("Algebra II no longer exists — detach it from this class first", "Cebir II");
    expect(gone.key).toBe("classBlueprints.skipCourseGone");
    expect(gone.vars).toEqual({ course: "Cebir II" });
  });

  it("falls back to the generic line rather than leaking unmapped English", () => {
    expect(skipReasonCopy("something the backend added later", "x").key).toBe("classBlueprints.skipOther");
  });
});
