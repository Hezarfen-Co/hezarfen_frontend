import { client } from "../client";
import type { ChatbotMessage } from "./types";

export function getChatbotMessageById(threadId: string, messageId: string): Promise<ChatbotMessage> {
  return client<ChatbotMessage>(
    `/chatbot/threads/${encodeURIComponent(threadId)}/messages/${encodeURIComponent(messageId)}`,
  );
}
