import { client, normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { ChatbotThread } from "./types";
export async function getChatbotThreads(params?: PageParams): Promise<Page<ChatbotThread>> {
  return normalizePage<ChatbotThread>(await client<unknown>(`/chatbot/threads${pageQuery(params)}`));
}
