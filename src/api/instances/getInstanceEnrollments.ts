import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { Enrollment } from "../client";

export async function getInstanceEnrollments(
  instanceId: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<Enrollment>> {
  const data = await client<unknown>(`/instances/${instanceId}/enrollments${pageQuery(params)}`, { signal });
  return normalizePage<Enrollment>(data);
}
