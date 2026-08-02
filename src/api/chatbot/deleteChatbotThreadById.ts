import { client } from "../client";
export function deleteChatbotThreadById(id: string): Promise<void> {
  return client<void>(`/chatbot/threads/${encodeURIComponent(id)}`, { method: "DELETE" });
}
