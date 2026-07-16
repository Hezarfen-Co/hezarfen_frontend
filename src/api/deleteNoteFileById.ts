import { client } from "./client";

export function deleteNoteFileById(noteId: string, fileId: string): Promise<void> {
  return client<void>(`/notes/${noteId}/files/${fileId}`, { method: "DELETE" });
}
