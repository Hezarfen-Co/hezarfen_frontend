import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { CourseMembership } from "../client";

/**
 * A club/etüt's own members — the school-scoped tier. An instance's roster is
 * `getInstanceEnrollments`. Requires teacher+ and catalog rights.
 */
export async function getCourseMembers(
  courseId: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<CourseMembership>> {
  const data = await client<unknown>(`/courses/${courseId}/members${pageQuery(params)}`, { signal });
  return normalizePage<CourseMembership>(data);
}
