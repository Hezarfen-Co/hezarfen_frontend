import { client } from "../client";
import { appendPageParams, normalizePage, type Page, type PageParams } from "../client";
import type { Course } from "../client";

/**
 * `GET /courses` and `GET /courses/me` take `limit`/`offset` and nothing else —
 * the backend has no kind/term/search filter, and serde drops unknown query
 * keys silently, so any extra param would look applied while doing nothing.
 * Narrow the list in the caller instead (see `courses-page.tsx`).
 */
export type CourseListParams = PageParams;

export function courseListQuery(params?: CourseListParams): string {
  if (!params) return "";
  const query = new URLSearchParams();
  appendPageParams(query, params);
  const value = query.toString();
  return value ? `?${value}` : "";
}

export async function getCourses(params?: CourseListParams, signal?: AbortSignal): Promise<Page<Course>> {
  const data = await client<unknown>(`/courses${courseListQuery(params)}`, { signal });
  return normalizePage<Course>(data);
}
