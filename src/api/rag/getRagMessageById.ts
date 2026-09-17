import { client } from "../client";
import type { RagMessage } from "../client";

/** Poll this while a turn is `pending`, or open its stream instead. */
export function getRagMessageById(threadId: string, messageId: string, signal?: AbortSignal): Promise<RagMessage> {
  const url = `/rag/threads/${encodeURIComponent(threadId)}/messages/${encodeURIComponent(messageId)}`;
  return client<RagMessage>(url, { signal });
}
