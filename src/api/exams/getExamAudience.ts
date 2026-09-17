import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { ExamAudience } from "../client";

/** The instances this exam is announced to beyond the one that owns it. */
export async function getExamAudience(
  examId: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<ExamAudience>> {
  const data = await client<unknown>(`/exams/${examId}/audience${pageQuery(params)}`, { signal });
  return normalizePage<ExamAudience>(data);
}
