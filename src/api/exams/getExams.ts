import { client } from "../client";
import {
  normalizePage,
  pageQuery,
  type Page,
  type PageParams,
  type ScheduleWindowParams,
} from "../client";
import type { Exam } from "../client";

export async function getExams(
  params?: PageParams & ScheduleWindowParams,
  signal?: AbortSignal
): Promise<Page<Exam>> {
  const data = await client<unknown>(`/exams${pageQuery(params)}`, { signal });
  return normalizePage<Exam>(data);
}
