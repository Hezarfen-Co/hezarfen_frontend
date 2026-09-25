import { client } from "../client";
import { appendPageParams, normalizePage, type ClassGroup, type Page, type PageParams } from "../client";

/**
 * `GET /classes` list filters. `grade_level` keeps classes on one rung of the
 * grade ladder; an omitted key filters nothing.
 */
export type ClassListParams = PageParams & {
  grade_level?: number;
};

export async function getClasses(params?: ClassListParams, signal?: AbortSignal): Promise<Page<ClassGroup>> {
  const query = new URLSearchParams();
  appendPageParams(query, params);
  // `!= null` is load-bearing: the API 400s on a present-but-empty value, so
  // an unset grade must drop the key, never emit `grade_level=`.
  if (params?.grade_level != null) query.set("grade_level", String(params.grade_level));
  const value = query.toString();
  const data = await client<unknown>(`/classes${value ? `?${value}` : ""}`, { signal });
  return normalizePage<ClassGroup>(data);
}
