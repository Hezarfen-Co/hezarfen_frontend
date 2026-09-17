import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { Exam } from "../client";

/** Drafts appear only to the instance's managers. */
export async function getInstanceExams(
  instanceId: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<Exam>> {
  const data = await client<unknown>(`/instances/${instanceId}/exams${pageQuery(params)}`, { signal });
  return normalizePage<Exam>(data);
}
