import { client } from "./client";
import type { Message } from "./types";

export type PostMessageBody = {
  recipient_id: string;
  subject: string;
  body?: string | null;
  label?: string | null;
};

export function postMessage(body: PostMessageBody): Promise<Message> {
  return client<Message>("/messages", { method: "POST", body });
}
