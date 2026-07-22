import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { HomeworkReportEntry } from "../client";

export async function getHomeworkReport(
  userId: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<HomeworkReportEntry>> {
  const data = await client<unknown>(`/homework/report/${userId}${pageQuery(params)}`, { signal });
  return normalizePage<HomeworkReportEntry>(data);
}
