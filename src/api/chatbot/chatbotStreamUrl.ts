/**
 * The SSE URL for one pending turn: `delta` chunks, then one `done` or
 * `error`. Not a request — hand it to an `EventSource` (`withCredentials: true`).
 */
export function chatbotStreamUrl(threadId: string, messageId: string): string {
  return `/api/chatbot/threads/${encodeURIComponent(threadId)}/messages/${encodeURIComponent(messageId)}/stream`;
}
