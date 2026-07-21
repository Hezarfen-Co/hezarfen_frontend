import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { Exam } from "../client";

export async function getExams(params?: PageParams, signal?: AbortSignal): Promise<Page<Exam>> {
  const data = await client<unknown>(`/exams${pageQuery(params)}`, { signal });
  return normalizePage<Exam>(data);
}
