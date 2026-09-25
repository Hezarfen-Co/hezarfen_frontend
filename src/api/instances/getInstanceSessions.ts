import { client } from "../client";
import { appendPageParams, normalizePage, type Page, type PageParams } from "../client";
import type { CourseSession } from "../client";

/**
 * `GET /instances/:id/sessions` filters. Both optional and AND-ed, unix ms,
 * and half-open `[from, to)` on the session start: `starts_at >= starts_after`
 * and `starts_at < starts_before`.
 */
export type InstanceSessionListParams = PageParams & {
  /** Keeps sessions starting at or after this instant. */
  starts_after?: number;
  /** Keeps sessions starting before this instant. */
  starts_before?: number;
};

export async function getInstanceSessions(
  instanceId: string,
  params?: InstanceSessionListParams,
  signal?: AbortSignal,
): Promise<Page<CourseSession>> {
  const query = new URLSearchParams();
  appendPageParams(query, params);
  // `!= null` is load-bearing: the API 400s on a present-but-empty value, so an
  // unset param must drop the key, never emit `key=`.
  if (params?.starts_after != null) query.set("starts_after", String(params.starts_after));
  if (params?.starts_before != null) query.set("starts_before", String(params.starts_before));
  const data = await client<unknown>(`/instances/${instanceId}/sessions${query.size ? `?${query}` : ""}`, { signal });
  return normalizePage<CourseSession>(data);
}
