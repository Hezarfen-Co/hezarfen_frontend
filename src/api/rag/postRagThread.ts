import { client } from "../client";
import type { RagThread } from "../client";

/** Blank counts as absent — an untitled thread is normal, labelled from its first turn. */
export function postRagThread(title?: string | null): Promise<RagThread> {
  return client<RagThread>("/rag/threads", { method: "POST", body: { title: title ?? null } });
}
