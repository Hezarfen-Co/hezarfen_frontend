import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { CourseSession } from "../client";

export async function getInstanceSessions(
  instanceId: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<CourseSession>> {
  const data = await client<unknown>(`/instances/${instanceId}/sessions${pageQuery(params)}`, { signal });
  return normalizePage<CourseSession>(data);
}
