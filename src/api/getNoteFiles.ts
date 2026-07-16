import { client } from "./client";
import { normalizePage, pageQuery, type Page, type PageParams } from "./page";
import type { NoteFile } from "./types";

export async function getNoteFiles(noteId: string, params?: PageParams, signal?: AbortSignal): Promise<Page<NoteFile>> {
  const data = await client<unknown>(`/notes/${noteId}/files${pageQuery(params)}`, { signal });
  return normalizePage<NoteFile>(data);
}
