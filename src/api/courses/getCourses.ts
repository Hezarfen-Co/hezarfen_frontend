import { client } from "../client";
import { appendPageParams, normalizePage, type Course, type Page, type PageParams } from "../client";
import type { CourseKind } from "../client";

/**
 * `GET /courses` list filters. `kind` keeps one course kind, `q` is the
 * server-side catalog search, `taught` keeps courses with (`true`) or without
 * (`false`) an attached şube. All optional, AND-ed with each other and with
 * `limit`/`offset`; an omitted key filters nothing.
 */
export type CourseListParams = PageParams & {
  kind?: CourseKind;
  q?: string;
  taught?: boolean;
};

export function courseListQuery(params?: CourseListParams): string {
  if (!params) return "";
  const query = new URLSearchParams();
  appendPageParams(query, params);
  if (params.kind != null) query.set("kind", params.kind);
  // Trimmed here so every caller sends the same thing; blank drops the key —
  // the API 400s on a present-but-empty value (`?q=`).
  const q = params.q?.trim();
  if (q) query.set("q", q);
  // Serializes as `taught=true` / `taught=false`; unset drops the key (both).
  if (params.taught != null) query.set("taught", String(params.taught));
  const value = query.toString();
  return value ? `?${value}` : "";
}

export async function getCourses(params?: CourseListParams, signal?: AbortSignal): Promise<Page<Course>> {
  const data = await client<unknown>(`/courses${courseListQuery(params)}`, { signal });
  return normalizePage<Course>(data);
}
