import { client } from "../client";
import { appendPageParams, normalizePage, type Page, type PageParams } from "../client";
import type { Holiday } from "../client";

/** `from`/`to` (UTC unix-millis) keep the holidays overlapping that window. */
export type HolidayListParams = PageParams & { from?: number; to?: number };

// Any signed-in session reads the calendar; newest start first.
export async function getHolidays(params?: HolidayListParams, signal?: AbortSignal): Promise<Page<Holiday>> {
  const query = new URLSearchParams();
  appendPageParams(query, params);
  if (params?.from != null) query.set("from", String(params.from));
  if (params?.to != null) query.set("to", String(params.to));
  const value = query.toString();
  const data = await client<unknown>(`/holidays${value ? `?${value}` : ""}`, { signal });
  return normalizePage<Holiday>(data);
}
