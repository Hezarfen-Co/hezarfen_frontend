export type ChatbotMessageStatus = "pending" | "complete" | "failed";

export type ChatbotThread = {
  id: string;
  title: string | null;
  created_at: number;
  updated_at: number;
};

export type ChatbotThreadBody = { title?: string | null };

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
};

export type AcceptedChatbotMessage = {
  message_id: string;
  status: "pending";
};

export type ChatbotStreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; message: ChatbotMessage }
  | { type: "error"; code: string; message: string };
