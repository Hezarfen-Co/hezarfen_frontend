import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { Note } from "../client";

export async function getNotes(params?: PageParams, signal?: AbortSignal): Promise<Page<Note>> {
  const data = await client<unknown>(`/notes${pageQuery(params)}`, { signal });
  return normalizePage<Note>(data);
}
