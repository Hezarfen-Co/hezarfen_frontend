import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { Homework } from "../client";

/** A student sees only the homework they are assigned, `assigned` narrowed to themselves. */
export async function getInstanceHomework(
  instanceId: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<Homework>> {
  const data = await client<unknown>(`/instances/${instanceId}/homework${pageQuery(params)}`, { signal });
  return normalizePage<Homework>(data);
}
