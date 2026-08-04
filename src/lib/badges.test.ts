import { describe, expect, it } from "vitest";
import {
  badgeDescKey,
  badgeNameKey,
  badgeProgress,
  badgeProgressLabel,
  badgeProgressRatio,
  badgeRemaining,
} from "./badges";
import type { ProfileStats } from "@/api/client";

const stats: ProfileStats = {
  pomodoro_sessions: 0,
  pomodoro_focus_ms: 0,
  courses: 0,
  classes: 0,
  homework_submitted_total: 7,
  homework_on_time_total: 3,
  exam_sat_total: 0,
  pomodoro_finished_total: 12,
  pomodoro_focus_ms_total: 5_400_000, // 1.5 h
};

describe("badge copy lookup", () => {
  it("resolves the known catalogue ids", () => {
    expect(badgeNameKey("homework_submitted_10")).toBe("badge.homework_submitted_10.name");
    expect(badgeDescKey("exam_sat_1")).toBe("badge.exam_sat_1.desc");
  });

  it("returns null for an id shipped after this build, so the caller can fall back", () => {
    expect(badgeNameKey("streak_1000")).toBeNull();
    expect(badgeDescKey("streak_1000")).toBeNull();
  });
});

describe("badgeProgress", () => {
  it("reads the lifetime counter behind each stat", () => {
    expect(badgeProgress("homework_submitted", stats)).toBe(7);
    expect(badgeProgress("pomodoro_focus_ms", stats)).toBe(5_400_000);
  });

  it("is null for an unknown stat rather than zero, so the tile shows no bar", () => {
    expect(badgeProgress("streak_days", stats)).toBeNull();
  });
});

describe("badgeProgressRatio", () => {
  it("clamps to 0..1", () => {
    expect(badgeProgressRatio(7, 10)).toBeCloseTo(0.7);
    expect(badgeProgressRatio(50, 10)).toBe(1);
    expect(badgeProgressRatio(-1, 10)).toBe(0);
  });

  it("treats a zero threshold as complete instead of dividing by zero", () => {
    expect(badgeProgressRatio(0, 0)).toBe(1);
  });
});

describe("badgeRemaining", () => {
  it("counts down plain totals", () => {
    expect(badgeRemaining("homework_submitted", 7, 10)).toBe(3);
  });

  it("counts focus time down in whole hours, rounding up", () => {
    // 1.5 h done toward 10 h — 8.5 h left reads as 9, never 8.
    expect(badgeRemaining("pomodoro_focus_ms", 5_400_000, 36_000_000)).toBe(9);
  });

  it("never goes negative — an award is permanent even if the counter falls back", () => {
    expect(badgeRemaining("homework_submitted", 12, 10)).toBe(0);
    expect(badgeRemaining("pomodoro_focus_ms", 40_000_000, 36_000_000)).toBe(0);
  });
});

describe("badgeProgressLabel", () => {
  it("renders focus time as hours and everything else as a count", () => {
    expect(badgeProgressLabel("pomodoro_focus_ms", 5_400_000)).toBe("1");
    expect(badgeProgressLabel("homework_submitted", 7)).toBe("7");
  });
});
