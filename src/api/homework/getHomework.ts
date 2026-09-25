import { client } from "../client";
import { appendPageParams, normalizePage, type Page, type PageParams } from "../client";
import type { Homework } from "../client";

/**
 * `GET /homework` filters. All optional and AND-ed; a well-formed
 * `class_course` uuid that names no row answers an empty page. The due bounds
 * are unix ms and half-open on `due_at`.
 */
export type HomeworkListParams = PageParams & {
  /** Keeps rows not yet due: `due_at >= v`. */
  due_after?: number;
  /** Keeps rows already due: `due_at < v`. */
  due_before?: number;
  /** Only homework filed against this instance (şube × ders). */
  class_course?: string;
};

export async function getHomework(params?: HomeworkListParams, signal?: AbortSignal): Promise<Page<Homework>> {
  const query = new URLSearchParams();
  appendPageParams(query, params);
  // `!= null` is load-bearing: the API 400s on a present-but-empty value, so an
  // unset param must drop the key, never emit `key=`.
  if (params?.due_after != null) query.set("due_after", String(params.due_after));
  if (params?.due_before != null) query.set("due_before", String(params.due_before));
  const course = params?.class_course?.trim();
  if (course) query.set("class_course", course);
  const suffix = query.size ? `?${query}` : "";
  const data = await client<unknown>(`/homework${suffix}`, { signal });
  return normalizePage<Homework>(data);
}
