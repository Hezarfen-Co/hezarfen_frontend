import { client } from "../client";
import type { RagThread } from "../client";

/** `null` — or blank — clears the title back to untitled. */
export function patchRagThreadById(threadId: string, title: string | null): Promise<RagThread> {
  return client<RagThread>(`/rag/threads/${encodeURIComponent(threadId)}`, {
    method: "PATCH",
    body: { title },
  });
}
