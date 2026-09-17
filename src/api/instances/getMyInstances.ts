import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { Instance } from "../client";

/**
 * The instances the caller may act in or see: a student's şube memberships, a
 * homeroom teacher's, plus the instances a teacher was assigned to run. One
 * rule for what is "theirs", shared with every instance-scoped gate.
 */
export async function getMyInstances(params?: PageParams, signal?: AbortSignal): Promise<Page<Instance>> {
  const data = await client<unknown>(`/instances/me${pageQuery(params)}`, { signal });
  return normalizePage<Instance>(data);
}
