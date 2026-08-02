import { client, normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { Board } from "./types";

// Boards the caller created or was invited to, newest first.
export async function getBoards(params?: PageParams, signal?: AbortSignal): Promise<Page<Board>> {
  const data = await client<unknown>(`/boards${pageQuery(params)}`, { signal });
  return normalizePage<Board>(data);
}
