import { client } from "./client";
import { normalizePage, pageQuery, type Page, type PageParams } from "./page";
import type { Attendance } from "./types";

export async function getEventAttendance(
  eventId: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<Attendance>> {
  const data = await client<unknown>(`/events/${eventId}/attendance${pageQuery(params)}`, { signal });
  return normalizePage<Attendance>(data);
}
