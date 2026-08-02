import { client } from "../client";
import { appendPageParams, normalizePage, type Page, type PageParams } from "../client";
import type { Course, CourseKind } from "../client";

export type CourseListParams = PageParams & {
  kind?: CourseKind;
  q?: string;
  term_id?: string;
};

export function courseListQuery(params?: CourseListParams): string {
  if (!params) return "";
  const query = new URLSearchParams();
  appendPageParams(query, params);
  if (params.kind) query.set("kind", params.kind);
  if (params.q) query.set("q", params.q);
  if (params.term_id) query.set("term_id", params.term_id);
  const value = query.toString();
  return value ? `?${value}` : "";
}

export async function getCourses(params?: CourseListParams, signal?: AbortSignal): Promise<Page<Course>> {
  const data = await client<unknown>(`/courses${courseListQuery(params)}`, { signal });
  return normalizePage<Course>(data);
}
