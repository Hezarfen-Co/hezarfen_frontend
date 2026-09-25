import { client } from "../client";

// Drops one kind's row; the map stays the section's own.
export function deleteInstanceExamWeightByKind(id: string, kind: string): Promise<void> {
  return client<void>(`/instances/${id}/exam-weights/${encodeURIComponent(kind)}`, { method: "DELETE" });
}
