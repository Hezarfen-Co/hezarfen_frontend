// Time helpers: the API speaks unix milliseconds, <input type="datetime-local">
// speaks "YYYY-MM-DDTHH:mm" in local time. Plus the one person-display rule.

import { locale, t } from "./i18n";
import type { PersonRef } from "./types";

/** What to call a person in the UI: their name if we have it, else username. */
export function personLabel(person: PersonRef): string {
  return person.display_name ?? person.username;
}

export function formatMillis(millis: number | null): string {
  return millis === null
    ? "—"
    : new Intl.DateTimeFormat(locale(), {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(millis));
}

/** Human line for an event's time window. */
export function formatWindow(starts: number | null, ends: number | null): string {
  if (starts === null && ends === null) return t("unscheduled");
  if (starts !== null && ends !== null)
    return `${formatMillis(starts)} → ${formatMillis(ends)}`;
  return starts !== null ? formatMillis(starts) : t("until")(formatMillis(ends));
}

/** Unix ms → value for a datetime-local input ("" when null). */
export function toInputValue(millis: number | null): string {
  if (millis === null) return "";
  const date = new Date(millis);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** datetime-local input value → unix ms, null when empty. */
export function fromInputValue(value: string): number | null {
  return value === "" ? null : new Date(value).getTime();
}

/** Milliseconds left → "m:ss" (or "h:mm:ss"), floored at zero. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

/** The local date as "YYYY-MM-DD" — e.g. the max for a birth-date input. */
export function today(): string {
  const date = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
