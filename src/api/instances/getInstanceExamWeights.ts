import { client } from "../client";
import type { ExamWeightEntry } from "../client";

export type InstanceExamWeights = { inherited: boolean; weights: ExamWeightEntry[] };

export function getInstanceExamWeights(id: string, signal?: AbortSignal): Promise<InstanceExamWeights> {
  return client<InstanceExamWeights>(`/instances/${id}/exam-weights`, { signal });
}
