import { client, normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { ChatbotMessage } from "./types";
export async function getChatbotThreadMessages(threadId: string, params?: PageParams): Promise<Page<ChatbotMessage>> {
  return normalizePage<ChatbotMessage>(await client<unknown>(`/chatbot/threads/${encodeURIComponent(threadId)}/messages${pageQuery(params)}`));
}
