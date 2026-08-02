import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { ClassMember } from "../client";

export async function getClassMembers(classId: string, params?: PageParams, signal?: AbortSignal): Promise<Page<ClassMember>> {
  const data = await client<unknown>(`/classes/${classId}/members${pageQuery(params)}`, { signal });
  return normalizePage<ClassMember>(data);
}
