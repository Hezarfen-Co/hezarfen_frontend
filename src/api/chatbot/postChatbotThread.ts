import { client } from "../client";
import type { ChatbotThread } from "./types";

export function postChatbotThread(): Promise<ChatbotThread> {
  return client<ChatbotThread>("/chatbot/threads", { method: "POST", body: {} });
}
