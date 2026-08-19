import { blobClient } from "../client";

export async function getCourseNoteFileBlob(noteId: string, fileId: string, signal?: AbortSignal): Promise<Blob> {
  return blobClient(`/course-notes/${noteId}/files/${fileId}`, signal);
}
