import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { CourseSectionRef } from "../client";

// One row per class section the caller reaches (şube roster, homeroom, taught,
// or a hand-placed enrollment) — `id` is the instance id, never the catalog
// course's; `course` names the catalog row.
export async function getMyCourses(params?: PageParams, signal?: AbortSignal): Promise<Page<CourseSectionRef>> {
  const data = await client<unknown>(`/courses/me${pageQuery(params)}`, { signal });
  return normalizePage<CourseSectionRef>(data);
}
