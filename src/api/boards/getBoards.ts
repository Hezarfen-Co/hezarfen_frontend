import { appendPageParams, client, normalizePage, type Page, type PageParams } from "../client";
import type { Board } from "./types";

// Boards the caller created or was invited to, newest first. `q` filters by
// title server-side; blank after trim means no filter.
export async function getBoards(
  params?: PageParams & { q?: string },
  signal?: AbortSignal,
): Promise<Page<Board>> {
  const query = new URLSearchParams();
  const q = params?.q?.trim();
  if (q) query.set("q", q);
  appendPageParams(query, params);
  const search = query.toString();
  const data = await client<unknown>(`/boards${search ? `?${search}` : ""}`, { signal });
  return normalizePage<Board>(data);
}
