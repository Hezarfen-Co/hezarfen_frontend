import { client } from "../client";

// Drops the template's row; the settings weight applies again.
export function deleteOfferingExamWeightByKind(id: string, kind: string): Promise<void> {
  return client<void>(`/offerings/${id}/exam-weights/${encodeURIComponent(kind)}`, { method: "DELETE" });
}
