import { client } from "../client";

export function deleteCourseNoteFileById(noteId: string, fileId: string): Promise<void> {
  return client<void>(`/course-notes/${noteId}/files/${fileId}`, { method: "DELETE" });
}
