// Time helpers: the API speaks unix milliseconds, <input type="datetime-local">
// speaks "YYYY-MM-DDTHH:mm" in local time.

const formatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatMillis(millis: number | null): string {
  return millis === null ? "—" : formatter.format(new Date(millis));
}

/** Human line for an event's time window. */
export function formatWindow(starts: number | null, ends: number | null): string {
  if (starts === null && ends === null) return "Unscheduled";
  if (starts !== null && ends !== null)
    return `${formatMillis(starts)} → ${formatMillis(ends)}`;
  return starts !== null ? formatMillis(starts) : `Until ${formatMillis(ends)}`;
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

/** The local date as "YYYY-MM-DD" — e.g. the max for a birth-date input. */
export function today(): string {
  const date = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
