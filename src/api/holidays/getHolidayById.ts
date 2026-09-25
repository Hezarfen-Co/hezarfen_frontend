import { client } from "../client";
import type { Holiday } from "../client";

export function getHolidayById(id: string, signal?: AbortSignal): Promise<Holiday> {
  return client<Holiday>(`/holidays/${id}`, { signal });
}
