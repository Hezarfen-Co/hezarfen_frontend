import { client } from "../client";
import type { ChatbotThread, ChatbotThreadBody } from "./types";
export function patchChatbotThreadById(id: string, body: ChatbotThreadBody): Promise<ChatbotThread> {
  return client<ChatbotThread>(`/chatbot/threads/${encodeURIComponent(id)}`, { method: "PATCH", body });
}
