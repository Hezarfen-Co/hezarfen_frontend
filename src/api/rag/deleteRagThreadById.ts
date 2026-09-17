import { client } from "../client";

export function deleteRagThreadById(threadId: string): Promise<void> {
  return client<void>(`/rag/threads/${encodeURIComponent(threadId)}`, { method: "DELETE" });
}
