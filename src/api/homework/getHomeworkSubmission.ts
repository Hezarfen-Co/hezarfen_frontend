import { client } from "../client";
import type { HomeworkSubmission } from "../client";

export function getHomeworkSubmission(id: string, signal?: AbortSignal): Promise<HomeworkSubmission> {
  return client<HomeworkSubmission>(`/homework/${id}/submission`, { signal });
}
