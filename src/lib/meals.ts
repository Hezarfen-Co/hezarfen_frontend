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

const BOOKING_STATE_LABELS: Record<string, MessageKey> = {
  booked: "meals.bookingState.booked",
  cancelled: "meals.bookingState.cancelled",
};

const SERVICE_STATUS_LABELS: Record<string, MessageKey> = {
  served: "meals.served",
  missed: "meals.missed",
};

const LEDGER_KIND_LABELS: Record<string, MessageKey> = {
  charge: "meals.ledger.charge",
  credit: "meals.ledger.credit",
  reversal: "meals.ledger.reversal",
};

export function mealBookingStateLabel(status: string, t: T): string {
  return lookup(BOOKING_STATE_LABELS, status, t);
}

export function mealServiceStatusLabel(status: string, t: T): string {
  return lookup(SERVICE_STATUS_LABELS, status, t);
}

export function mealLedgerKindLabel(kind: string, t: T): string {
  return lookup(LEDGER_KIND_LABELS, kind, t);
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

const DAY_MS = 86_400_000;
const isoToUtcMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const utcMsToIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** The viewer's own calendar day as yyyy-mm-dd (menus are plain calendar dates). */
export function localIsoDate(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDaysIso(iso: string, days: number): string {
  return utcMsToIso(isoToUtcMs(iso) + days * DAY_MS);
}

/** Monday of the week holding `iso`. */
export function weekStartIso(iso: string): string {
  const weekday = new Date(isoToUtcMs(iso)).getUTCDay();
  return addDaysIso(iso, -((weekday + 6) % 7));
}

/** Menus grouped per date (ascending), each day's slots in the school's slot order. */
export function groupMenusByDay<M extends { date: string; slot: string }>(menus: M[], slotOrder: string[]): { date: string; menus: M[] }[] {
  const rank = (slot: string) => {
    const index = slotOrder.indexOf(slot);
    return index === -1 ? slotOrder.length : index;
  };
  const days = new Map<string, M[]>();
  for (const menu of menus) days.set(menu.date, [...(days.get(menu.date) ?? []), menu]);
  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({ date, menus: [...items].sort((a, b) => rank(a.slot) - rank(b.slot) || a.slot.localeCompare(b.slot)) }));
}

/** "Çarşamba, 21 Ekim" — a menu's calendar date, never shifted by the viewer's zone. */
export function formatMealDay(iso: string, locale: string, withYear = false): string {
  return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" })
    .format(new Date(isoToUtcMs(iso)));
}

/** "22 – 28 Eylül 2026" for the Monday-to-Sunday week starting at `startIso`. */
export function formatMealWeek(startIso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .formatRange(new Date(isoToUtcMs(startIso)), new Date(isoToUtcMs(addDaysIso(startIso, 6))));
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
