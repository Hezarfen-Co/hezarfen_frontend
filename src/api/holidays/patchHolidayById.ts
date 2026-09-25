import { client } from "../client";
import type { Holiday } from "../client";

/** Omit a field to keep it; the merged range must stay ordered. */
export type UpdateHolidayBody = Partial<{ name: string; kind: string; starts_at: number; ends_at: number }>;

export function patchHolidayById(id: string, body: UpdateHolidayBody): Promise<Holiday> {
  return client<Holiday>(`/holidays/${id}`, { method: "PATCH", body });
}
