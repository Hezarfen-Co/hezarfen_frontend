import { client } from "../client";
import {
  normalizePage,
  pageQuery,
  type Page,
  type PageParams,
  type ScheduleWindowParams,
} from "../client";
import type { Event } from "../client";

export async function getEvents(
  params?: PageParams & ScheduleWindowParams,
  signal?: AbortSignal
): Promise<Page<Event>> {
  const data = await client<unknown>(`/events${pageQuery(params)}`, { signal });
  return normalizePage<Event>(data);
}
