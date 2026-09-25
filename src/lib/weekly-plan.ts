import type { Locale } from "@/i18n/messages";
import type { WeeklySlot } from "@/api/client";

/** 540 → "09:00". */
export function minutesToHHmm(minutes: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** "09:00" → 540, or null when the text is not a valid HH:mm. */
export function hhmmToMinutes(text: string): number | null {
  const match = text.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** The backend's weekdays: 1 = Monday .. 7 = Sunday. */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

/** Localized weekday name for a 1 (Monday) .. 7 (Sunday) weekday. */
export function weekdayLabel(weekday: number, locale: Locale): string {
  // 2024-01-01 was a Monday, so day `weekday` of that week names it.
  const date = new Date(Date.UTC(2024, 0, weekday));
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-GB", { weekday: "long", timeZone: "UTC" }).format(date);
}

/** Weekday first, then start time — the order the backend lists a plan in. */
export function sortSlots(slots: WeeklySlot[]): WeeklySlot[] {
  return slots.slice().sort((a, b) => a.weekday - b.weekday || a.starts_at - b.starts_at);
}
