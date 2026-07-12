const dateTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDateTime(ms: number | null | undefined): string {
  if (ms == null) return "—";
  return dateTime.format(new Date(ms));
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

export function formatDurationMinutes(ms: number | null | undefined): string {
  if (ms == null) return "—";
  return `${Math.round(ms / 60_000)} min`;
}
