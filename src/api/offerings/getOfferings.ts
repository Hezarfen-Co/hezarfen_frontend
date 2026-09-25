import { client } from "../client";
import { appendPageParams, normalizePage, type Page, type PageParams } from "../client";
import type { Offering } from "../client";

export type OfferingListParams = PageParams & { course?: string; grade_level?: number };

export async function getOfferings(params?: OfferingListParams, signal?: AbortSignal): Promise<Page<Offering>> {
  const query = new URLSearchParams();
  appendPageParams(query, params);
  if (params?.course) query.set("course", params.course);
  if (params?.grade_level != null) query.set("grade_level", String(params.grade_level));
  const value = query.toString();
  const data = await client<unknown>(`/offerings${value ? `?${value}` : ""}`, { signal });
  return normalizePage<Offering>(data);
}
