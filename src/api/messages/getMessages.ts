import { client } from "../client";
import type { Page, PageParams } from "../client";
import type { Message, MessageFolder } from "../client";

export function getMessages(
  folder: MessageFolder = "inbox",
  options?: PageParams & { read?: boolean }
): Promise<Page<Message>> {
  const params = new URLSearchParams();
  params.set("folder", folder);
  if (options?.read !== undefined) params.set("read", String(options.read));
  if (options?.limit !== undefined) params.set("limit", String(options.limit));
  if (options?.offset !== undefined) params.set("offset", String(options.offset));
  
  const q = params.toString();
  const url = q ? `/messages?${q}` : `/messages`;
  return client<Page<Message>>(url);
}
