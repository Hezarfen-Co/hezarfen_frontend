import { describe, expect, it } from "vitest";
import type { Term } from "@/api/client";
import { pickCurrentTerm } from "./terms";

const day = 86_400_000;
const term = (id: string, starts: number, ends: number, archived = false): Term => ({
  id,
  name: id,
  year: "y",
  starts_at: starts * day,
  ends_at: ends * day,
  archived_at: archived ? 1 : null,
});

describe("pickCurrentTerm", () => {
  // Newest first, as the backend lists them.
  const list = [term("second", 150, 300), term("first", 0, 140)];

  it("picks the term whose range contains today", () => {
    expect(pickCurrentTerm(list, 20 * day)?.id).toBe("first");
    expect(pickCurrentTerm(list, 200 * day)?.id).toBe("second");
  });

  it("falls back to the nearest upcoming term between terms", () => {
    expect(pickCurrentTerm(list, 145 * day)?.id).toBe("second");
    expect(pickCurrentTerm([term("late", 400, 500), term("soon", 50, 90)], 10 * day)?.id).toBe("soon");
  });

  it("falls back to the first term when all are past", () => {
    expect(pickCurrentTerm(list, 999 * day)?.id).toBe("second");
  });

  it("skips archived terms unless nothing else is left", () => {
    expect(pickCurrentTerm([term("old", 0, 100, true), term("next", 200, 300)], 50 * day)?.id).toBe("next");
    expect(pickCurrentTerm([term("old", 0, 100, true)], 50 * day)?.id).toBe("old");
    expect(pickCurrentTerm([], 0)).toBeUndefined();
  });
});
