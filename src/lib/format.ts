import type { Locale } from "@/i18n/messages";

export function formatDateTime(ms: number | null | undefined, locale: Locale = "en"): string {
  if (ms == null) return "—";
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ms));
}

/** Convert datetime-local input value to unix ms, or null if empty. */
export function localInputToMs(value: string): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Convert unix ms to datetime-local input value. */
export function msToLocalInput(ms: number | null | undefined): string {
  if (ms == null) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function msToDateTimeText(ms: number | null | undefined): string {
  return msToLocalInput(ms).replace("T", " ");
}

export function msToLocalDate(ms: number | null | undefined): string {
  return msToLocalInput(ms).slice(0, 10);
}

export function msToLocalHour(ms: number | null | undefined): string {
  return msToLocalInput(ms).slice(11, 13);
}

export function msToLocalMinute(ms: number | null | undefined): string {
  return msToLocalInput(ms).slice(14, 16);
}

export function localPartsToMs(date: string, hour: string, minute: string): number | null {
  if (!date || !hour || !minute) return null;
  const [year, month, day] = date.split("-").map(Number);
  const h = Number(hour);
  const m = Number(minute);
  if (![year, month, day, h, m].every(Number.isInteger)) return null;
  const d = new Date(year, month - 1, day, h, m, 0, 0);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day ||
    d.getHours() !== h ||
    d.getMinutes() !== m
  ) {
    return null;
  }
  return d.getTime();
}

export function dateTimeTextToMs(value: string): number | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw] = match;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (![year, month, day, hour, minute].every(Number.isInteger)) return null;
  const d = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day ||
    d.getHours() !== hour ||
    d.getMinutes() !== minute
  ) {
    return null;
  }
  return d.getTime();
}

export function formatDurationMinutes(ms: number | null | undefined, locale: Locale = "en"): string {
  if (ms == null) return "—";
  return locale === "tr" ? `${Math.round(ms / 60_000)} dk` : `${Math.round(ms / 60_000)} min`;
}

export function examDurationMs(durationMs: number | null | undefined, startsAt: number | null, endsAt: number | null): number | null {
  if (durationMs != null) return durationMs;
  if (startsAt == null || endsAt == null || endsAt <= startsAt) return null;
  return endsAt - startsAt;
}
