import { client } from "../client";
import type { AcceptedChatbotMessage } from "./types";

export function postChatbotMessage(threadId: string, content: string): Promise<AcceptedChatbotMessage> {
  return client<AcceptedChatbotMessage>(`/chatbot/threads/${encodeURIComponent(threadId)}/messages`, {
    method: "POST",
    body: { content },
  });
}
