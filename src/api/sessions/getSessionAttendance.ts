import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { SessionAttendance } from "../client";

export async function getSessionAttendance(
  id: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<SessionAttendance>> {
  const data = await client<unknown>(`/sessions/${id}/attendance${pageQuery(params)}`, { signal });
  return normalizePage<SessionAttendance>(data);
}
