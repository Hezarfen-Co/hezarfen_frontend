import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { NoteFile } from "../client";

export async function getNoteFiles(noteId: string, params?: PageParams, signal?: AbortSignal): Promise<Page<NoteFile>> {
  const data = await client<unknown>(`/notes/${noteId}/files${pageQuery(params)}`, { signal });
  return normalizePage<NoteFile>(data);
}
