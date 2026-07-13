import { client } from "@/api/client";
import type { LiveMonitor } from "@/api/types";

export async function getExamLive(examId: string, signal?: AbortSignal): Promise<LiveMonitor> {
  return client<LiveMonitor>(`/exams/${encodeURIComponent(examId)}/live`, { signal });
}
