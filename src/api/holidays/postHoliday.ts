import { client } from "../client";
import type { Holiday } from "../client";

/** `starts_at`/`ends_at` are the first and last blocked instants, UTC unix-millis. */
export type CreateHolidayBody = { name: string; kind: string; starts_at: number; ends_at: number };

// Manager+. Past ranges are allowed — the calendar is a record.
export function postHoliday(body: CreateHolidayBody): Promise<Holiday> {
  return client<Holiday>("/holidays", { method: "POST", body });
}
