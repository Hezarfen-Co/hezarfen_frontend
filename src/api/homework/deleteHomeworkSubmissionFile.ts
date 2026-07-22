import { client } from "../client";

export function deleteHomeworkSubmissionFile(id: string, fileId: string): Promise<void> {
  return client<void>(`/homework/${id}/submission/files/${fileId}`, { method: "DELETE" });
}
