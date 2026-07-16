import { blobClient } from "./client";

export async function getNoteFileBlob(noteId: string, fileId: string, signal?: AbortSignal): Promise<Blob> {
  return blobClient(`/notes/${noteId}/files/${fileId}`, signal);
}
