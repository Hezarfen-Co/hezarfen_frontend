import { client } from "../client";
import type { Message, MessageFolder } from "../client";

export type PatchMessageBody = {
  folder?: MessageFolder | null;
  read?: boolean | null;
};

export function patchMessageById(id: string, body: PatchMessageBody): Promise<Message> {
  return client<Message>(`/messages/${id}`, { method: "PATCH", body });
}
