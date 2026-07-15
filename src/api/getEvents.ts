import { client } from "./client";
import { normalizePage, pageQuery, type Page, type PageParams } from "./page";
import type { Event } from "./types";

export async function getEvents(params?: PageParams, signal?: AbortSignal): Promise<Page<Event>> {
  const data = await client<unknown>(`/events${pageQuery(params)}`, { signal });
  return normalizePage<Event>(data);
}
