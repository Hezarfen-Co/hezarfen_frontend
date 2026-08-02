import { client } from "../client";
import type { ChatbotThread, ChatbotThreadBody } from "./types";

export function postChatbotThread(body: ChatbotThreadBody = {}): Promise<ChatbotThread> {
  return client<ChatbotThread>("/chatbot/threads", { method: "POST", body });
}
