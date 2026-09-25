import { client } from "../client";
import type { ExamWeightEntry } from "../client";

export function getOfferingExamWeights(id: string, signal?: AbortSignal): Promise<{ weights: ExamWeightEntry[] }> {
  return client<{ weights: ExamWeightEntry[] }>(`/offerings/${id}/exam-weights`, { signal });
}
