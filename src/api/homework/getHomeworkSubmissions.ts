import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { HomeworkRosterEntry } from "../client";

export async function getHomeworkSubmissions(
  id: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<HomeworkRosterEntry>> {
  const data = await client<unknown>(`/homework/${id}/submissions${pageQuery(params)}`, { signal });
  return normalizePage<HomeworkRosterEntry>(data);
}
