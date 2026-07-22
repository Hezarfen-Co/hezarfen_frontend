import { client } from "../client";

export function deleteHomeworkSubmission(id: string): Promise<void> {
  return client<void>(`/homework/${id}/submission`, { method: "DELETE" });
}
