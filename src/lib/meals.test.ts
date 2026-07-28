import { describe, expect, it } from "vitest";
import type { SchoolSettings } from "@/api/client";
import { dirtySettingsPatch, formatTry, mealCutoffAt, minuteToUtcTime, nextCourseWork, utcTimeToMinute } from "./meals";

describe("meal helpers", () => {
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

  it("selects nearest course work", () => {
    expect(nextCourseWork(
      "c1",
      [{ course: "c1", title: "Exam", starts_at: 30 } as never],
      [{ course: "c1", title: "Homework", due_at: 20 } as never],
    )?.title).toBe("Homework");
  });

  it("builds a field-only settings patch", () => {
    const before = {
      exam_kinds: [], attendance_statuses: [], grade_bands: [], max_file_bytes: 1,
      chatbot_history_turns: 1, max_chatbot_threads: 1, max_chatbot_message_len: 100,
      meal_slots: [], dietary_tags: [], meal_cancel_cutoff_minutes: null,
    } satisfies SchoolSettings;
    expect(dirtySettingsPatch(before, { ...before, max_chatbot_threads: 2 })).toEqual({ max_chatbot_threads: 2 });
  });
});
