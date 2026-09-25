import { client } from "../client";
import type { ExamWeightEntry } from "../client";

// Manager+. `kind` must be one the school runs (400 `unknown_exam_kind`);
// `weight` 1..100. Inheriting sections pick the change up at once.
export function patchOfferingExamWeight(id: string, body: ExamWeightEntry): Promise<{ weights: ExamWeightEntry[] }> {
  return client<{ weights: ExamWeightEntry[] }>(`/offerings/${id}/exam-weights`, { method: "PATCH", body });
}
