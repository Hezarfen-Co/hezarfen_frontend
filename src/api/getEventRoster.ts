import { client } from "./client";
import { normalizePage, pageQuery, type Page, type PageParams } from "./page";
import type { EventRosterEntry } from "./types";

export async function getEventRoster(
  eventId: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<EventRosterEntry>> {
  const data = await client<unknown>(`/events/${eventId}/roster${pageQuery(params)}`, { signal });
  return normalizePage<EventRosterEntry>(data);
}
