import { describe, expect, test } from "vitest";
import { hhmmToMinutes, minutesToHHmm, sortSlots, weekdayLabel } from "./weekly-plan";

describe("weekly plan helpers", () => {
  test("minutes and HH:mm round-trip", () => {
    expect(minutesToHHmm(540)).toBe("09:00");
    expect(minutesToHHmm(0)).toBe("00:00");
    expect(hhmmToMinutes("09:40")).toBe(580);
    expect(hhmmToMinutes("9:05")).toBe(545);
    expect(hhmmToMinutes("24:00")).toBeNull();
    expect(hhmmToMinutes("09:60")).toBeNull();
    expect(hhmmToMinutes("nine")).toBeNull();
  });

  test("weekday 1 is Monday and 7 is Sunday", () => {
    expect(weekdayLabel(1, "en")).toBe("Monday");
    expect(weekdayLabel(7, "en")).toBe("Sunday");
    expect(weekdayLabel(1, "tr")).toBe("Pazartesi");
  });

  test("slots sort by weekday, then start", () => {
    const slot = (id: string, weekday: number, starts_at: number) => ({ id, weekday, starts_at, ends_at: starts_at + 40 });
    expect(sortSlots([slot("c", 2, 540), slot("b", 1, 600), slot("a", 1, 540)]).map((s) => s.id)).toEqual(["a", "b", "c"]);
  });
});
