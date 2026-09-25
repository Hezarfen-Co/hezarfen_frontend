import { describe, expect, it, test } from "vitest";
import type { SchoolSettings } from "@/api/client";
import {
  addDaysIso,
  dirtySettingsPatch,
  formatMealDay,
  formatTry,
  groupMenusByDay,
  localIsoDate,
  mealCutoffAt,
  minuteToUtcTime,
  nextCourseWork,
  utcTimeToMinute,
  weekStartIso,
} from "./meals";

describe("meal helpers", () => {
  it("walks calendar weeks from Monday", () => {
    expect(weekStartIso("2026-09-25")).toBe("2026-09-21");
    expect(weekStartIso("2026-09-21")).toBe("2026-09-21");
    expect(weekStartIso("2026-09-27")).toBe("2026-09-21");
    expect(addDaysIso("2026-09-28", 7)).toBe("2026-10-05");
    expect(addDaysIso("2026-03-01", -1)).toBe("2026-02-28");
    expect(localIsoDate(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });

  it("groups menus per day in the school's slot order", () => {
    const menus = [
      { date: "2026-10-21", slot: "lunch" },
      { date: "2026-10-20", slot: "snack" },
      { date: "2026-10-21", slot: "breakfast" },
      { date: "2026-10-20", slot: "custom" },
    ];
    expect(groupMenusByDay(menus, ["breakfast", "lunch", "snack"])).toEqual([
      { date: "2026-10-20", menus: [{ date: "2026-10-20", slot: "snack" }, { date: "2026-10-20", slot: "custom" }] },
      { date: "2026-10-21", menus: [{ date: "2026-10-21", slot: "breakfast" }, { date: "2026-10-21", slot: "lunch" }] },
    ]);
  });

  it("formats a menu date without shifting it", () => {
    expect(formatMealDay("2026-10-21", "en-US")).toBe("Wednesday, October 21");
  });

  it("formats minor units as TRY", () => {
    expect(formatTry(4550, "tr-TR")).toContain("45,50");
  });

  it("converts UTC minute values", () => {
    expect(minuteToUtcTime(540)).toBe("09:00");
    expect(utcTimeToMinute("23:59")).toBe(1439);
    expect(utcTimeToMinute("24:00")).toBeNull();
  });

  it("calculates the booking cutoff in UTC", () => {
    expect(mealCutoffAt("2026-07-28", { name: "lunch", serving_minute: 720 }, 120))
      .toBe(Date.parse("2026-07-28T10:00:00Z"));
  });

  it("selects nearest course work for one instance", () => {
    expect(nextCourseWork(
      "i1",
      [{ class_course: "i1", title: "Exam", starts_at: 30 } as never],
      [{ class_course: "i1", title: "Homework", due_at: 20 } as never],
    )?.title).toBe("Homework");
  });

  // Two şubeler teaching the same course are two instances; work filed against
  // the other one must not surface here.
  it("ignores work filed against another instance", () => {
    expect(nextCourseWork(
      "i1",
      [{ class_course: "i2", title: "Exam", starts_at: 30 } as never],
      [{ class_course: "i2", title: "Homework", due_at: 20 } as never],
    )).toBeNull();
  });

  it("builds a field-only settings patch", () => {
    const before = {
      exam_kinds: [], attendance_statuses: [], grade_bands: [], max_file_bytes: 1,
      chatbot_history_turns: 1, max_chatbot_threads: 1, max_chatbot_message_len: 100,
      meal_slots: [], dietary_tags: [], meal_cancel_cutoff_minutes: null,
      branches: [], excuse_kinds: [], max_excused_absent_days: null,
      max_unexcused_absent_days: null, timezone: null,
    } satisfies SchoolSettings;
    expect(dirtySettingsPatch(before, { ...before, max_chatbot_threads: 2 })).toEqual({ max_chatbot_threads: 2 });
  });
});

test("meal slot and dietary tag labels map seeded keys and keep custom ones", async () => {
  const { mealSlotLabel, dietaryTagLabel } = await import("./meals");
  const t = (key: string) => `<${key}>`;
  expect(mealSlotLabel("breakfast", t)).toBe("<meals.slotName.breakfast>");
  expect(mealSlotLabel("ikindi", t)).toBe("ikindi");
  expect(dietaryTagLabel("gluten_free", t)).toBe("<meals.tagName.gluten_free>");
  expect(dietaryTagLabel("constructor", t)).toBe("constructor");
});
