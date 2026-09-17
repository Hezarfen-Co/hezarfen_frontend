import { client } from "../client";

/** The receipt for an accepted turn — the answer is not here yet. */
export type AcceptedRagMessage = {
  message_id: string;
  status: "pending";
};

/**
 * 202. The live message-length cap is the school's `max_chatbot_message_len`
 * (`GET /settings`), the same knob the chatbot nest uses.
 */
export function postRagMessage(threadId: string, content: string): Promise<AcceptedRagMessage> {
  return client<AcceptedRagMessage>(`/rag/threads/${encodeURIComponent(threadId)}/messages`, {
    method: "POST",
    body: { content },
  });
}
