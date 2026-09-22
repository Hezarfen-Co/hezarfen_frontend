import type { Exam, Homework, MealSlot, SchoolSettings } from "@/api/client";
import type { PatchSettingsBody } from "@/api/settings";
import type { MessageKey } from "@/i18n/messages";

type T = (key: MessageKey) => string;

// Meal slots and dietary tags are school-defined keys; these are the ones a
// school is seeded with. A key outside the map is shown as the school typed it.
const MEAL_SLOT_LABELS: Record<string, MessageKey> = {
  breakfast: "meals.slotName.breakfast",
  lunch: "meals.slotName.lunch",
  dinner: "meals.slotName.dinner",
  snack: "meals.slotName.snack",
};

const DIETARY_TAG_LABELS: Record<string, MessageKey> = {
  vegetarian: "meals.tagName.vegetarian",
  vegan: "meals.tagName.vegan",
  gluten_free: "meals.tagName.gluten_free",
  lactose_free: "meals.tagName.lactose_free",
  nut_allergy: "meals.tagName.nut_allergy",
};

function lookup(map: Record<string, MessageKey>, key: string, t: T): string {
  return Object.hasOwn(map, key) ? t(map[key]) : key;
}

export function mealSlotLabel(slot: string, t: T): string {
  return lookup(MEAL_SLOT_LABELS, slot, t);
}

export function dietaryTagLabel(tag: string, t: T): string {
  return lookup(DIETARY_TAG_LABELS, tag, t);
}

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

export function nextCourseWork(instanceId: string, exams: Exam[], homework: Homework[]) {
  return [
    ...exams.filter((item) => item.class_course === instanceId).map((item) => ({ kind: "exam" as const, title: item.title, at: item.starts_at ?? item.ends_at })),
    ...homework.filter((item) => item.class_course === instanceId).map((item) => ({ kind: "homework" as const, title: item.title, at: item.due_at })),
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
    "excuse_kinds",
    "branches",
    "max_excused_absent_days",
    "max_unexcused_absent_days",
    "timezone",
  ] as const) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) patch[key] = after[key] as never;
  }
  return patch;
}
