import { formClient } from "./client";
import type { NoteFile } from "./types";

export function postNoteFile(noteId: string, file: File, signal?: AbortSignal): Promise<NoteFile> {
  const body = new FormData();
  body.append("file", file);
  return formClient<NoteFile>(`/notes/${noteId}/files`, body, signal);
}
