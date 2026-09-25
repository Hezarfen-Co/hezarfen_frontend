import { appendPageParams, client } from "../client";
import type { Page, PageParams } from "../client";
import type { Message, MessageFolder } from "../client";

export function getMessages(
  folder: MessageFolder = "inbox",
  options?: PageParams & { read?: boolean; q?: string }
): Promise<Page<Message>> {
  const params = new URLSearchParams();
  params.set("folder", folder);
  if (options?.read !== undefined) params.set("read", String(options.read));
  // Free-text search is server-side; blank after trim means no filter.
  const q = options?.q?.trim();
  if (q) params.set("q", q);
  appendPageParams(params, options);

  const query = params.toString();
  const url = query ? `/messages?${query}` : `/messages`;
  return client<Page<Message>>(url);
}
