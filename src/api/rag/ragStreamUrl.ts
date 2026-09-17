/**
 * The SSE URL for one pending turn. Not a request — hand it to an
 * `EventSource` (`withCredentials: true`), the way the çelebi panel does.
 */
export function ragStreamUrl(threadId: string, messageId: string): string {
  return `/api/rag/threads/${encodeURIComponent(threadId)}/messages/${encodeURIComponent(messageId)}/stream`;
}
