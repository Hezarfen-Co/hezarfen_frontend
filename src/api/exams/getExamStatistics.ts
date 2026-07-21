import { client } from "@/api/client";
import type { ExamStatistics } from "@/api/client";

export async function getExamStatistics(examId: string, signal?: AbortSignal): Promise<ExamStatistics> {
  return client<ExamStatistics>(`/exams/${encodeURIComponent(examId)}/statistics`, { signal });
}
