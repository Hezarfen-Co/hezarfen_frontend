import type { Locale } from "@/i18n/messages";

export function formatDateTime(ms: number | null | undefined, locale: Locale = "en"): string {
  if (ms == null) return "—";
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ms));
}

/** Date only, no time — for stacked date/time cells. */
export function formatDate(ms: number | null | undefined, locale: Locale = "en"): string {
  if (ms == null) return "—";
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    dateStyle: "medium",
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

export function formatDurationMinutes(ms: number | null | undefined, locale: Locale = "en"): string {
  if (ms == null) return "—";
  return locale === "tr" ? `${Math.round(ms / 60_000)} dk` : `${Math.round(ms / 60_000)} min`;
}

export function formatDurationClock(ms: number | null | undefined): string {
  if (ms == null) return "--:--";
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function examDurationMs(durationMs: number | null | undefined, startsAt: number | null, endsAt: number | null): number | null {
  if (durationMs != null) return durationMs;
  if (startsAt == null || endsAt == null || endsAt <= startsAt) return null;
  return endsAt - startsAt;
}

/**
 * A mark or average with a fixed number of decimals in the reader's locale:
 * "68,2" in Turkish, "68.2" in English.
 */
export function formatDecimal(value: number | null | undefined, locale: Locale = "en", digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/**
 * A chart or count value in the reader's locale with up to `maxDigits`
 * decimals: "1.234,5" in Turkish, "1,234.5" in English. Whole numbers stay whole.
 */
export function formatNumber(value: number | null | undefined, locale: Locale = "en", maxDigits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", { maximumFractionDigits: maxDigits }).format(value);
}
