import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { ClassBlueprint } from "../client";

export async function getClassBlueprints(
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<ClassBlueprint>> {
  const data = await client<unknown>(`/classes/blueprints${pageQuery(params)}`, { signal });
  return normalizePage<ClassBlueprint>(data);
}
