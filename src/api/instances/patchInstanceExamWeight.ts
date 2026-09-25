import { client } from "../client";
import type { ExamWeightEntry } from "../client";
import type { InstanceExamWeights } from "./getInstanceExamWeights";

// Sets one kind's weight and takes the whole map own: kinds without a row
// then weigh 1 here instead of following the offering.
export function patchInstanceExamWeight(id: string, body: ExamWeightEntry): Promise<InstanceExamWeights> {
  return client<InstanceExamWeights>(`/instances/${id}/exam-weights`, { method: "PATCH", body });
}
