export type ChatbotMessageStatus = "pending" | "complete" | "failed";

export type ChatbotThread = {
  id: string;
  title: string | null;
  created_at: number;
  updated_at: number;
};

export type ChatbotThreadBody = { title?: string | null };

/** Where an answer offers to take the user, rendered as a button under it. */
export type ChatbotNavigation = { route: string; label: string };

export type ChatbotMessage = {
  id: string;
  thread_id: string;
  role: "user" | "assistant";
  status: ChatbotMessageStatus;
  content: string;
  truncated: boolean;
  error_code: string | null;
  created_at: number;
  completed_at: number | null;
  /**
   * Optional halves of `chat.reply`: a place the answer can take the user, and
   * the follow-up questions it offers when it is not sure what was meant. Both
   * are absent until the backend sends them, and the panel renders nothing for
   * an answer that carries neither.
   */
  navigation?: ChatbotNavigation | null;
  suggestions?: string[] | null;
};

export type AcceptedChatbotMessage = {
  message_id: string;
  status: "pending";
};

export type ChatbotStreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; message: ChatbotMessage }
  | { type: "error"; code: string; message: string };
