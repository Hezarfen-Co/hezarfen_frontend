import { client } from "../client";
import type { HomeworkResult } from "../client";

export function getHomeworkResult(id: string, signal?: AbortSignal): Promise<HomeworkResult> {
  return client<HomeworkResult>(`/homework/${id}/result`, { signal });
}
