import type { Exam, Homework, MealSlot, SchoolSettings } from "@/api/client";
import type { PatchSettingsBody } from "@/api/settings";

export function formatTry(minor: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "TRY" }).format(minor / 100);
}

export function minuteToUtcTime(minute: number | null): string {
  if (minute == null) return "";
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

export function utcTimeToMinute(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function mealCutoffAt(date: string, slot: MealSlot | undefined, minutes: number | null): number | null {
  if (minutes == null) return null;
  const servingMinute = slot?.serving_minute ?? 0;
  return Date.parse(`${date}T00:00:00Z`) + servingMinute * 60_000 - minutes * 60_000;
}

export function nextCourseWork(courseId: string, exams: Exam[], homework: Homework[]) {
  return [
    ...exams.filter((item) => item.course === courseId).map((item) => ({ kind: "exam" as const, title: item.title, at: item.starts_at ?? item.ends_at })),
    ...homework.filter((item) => item.course === courseId).map((item) => ({ kind: "homework" as const, title: item.title, at: item.due_at })),
  ]
    .filter((item): item is { kind: "exam" | "homework"; title: string; at: number } => item.at != null)
    .sort((a, b) => a.at - b.at)[0] ?? null;
}

export function dirtySettingsPatch(before: SchoolSettings, after: SchoolSettings): PatchSettingsBody {
  const patch: PatchSettingsBody = {};
  for (const key of [
    "exam_kinds",
    "attendance_statuses",
    "grade_bands",
    "max_file_bytes",
    "chatbot_history_turns",
    "max_chatbot_threads",
    "max_chatbot_message_len",
    "meal_slots",
    "dietary_tags",
    "meal_cancel_cutoff_minutes",
  ] as const) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) patch[key] = after[key] as never;
  }
  return patch;
}
