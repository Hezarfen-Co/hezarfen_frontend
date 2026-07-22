import { client } from "../client";

export function deleteHomeworkResultByUserId(id: string, userId: string): Promise<void> {
  return client<void>(`/homework/${id}/results/${userId}`, { method: "DELETE" });
}
