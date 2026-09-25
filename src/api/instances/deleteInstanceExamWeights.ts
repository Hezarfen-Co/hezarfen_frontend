import { client } from "../client";

// Resets the weights to inherit (offering, then settings, then 1).
export function deleteInstanceExamWeights(id: string): Promise<void> {
  return client<void>(`/instances/${id}/exam-weights`, { method: "DELETE" });
}
