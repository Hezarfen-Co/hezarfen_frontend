import { formClient } from "../client";
import type { NoteFile } from "../client";

export function postCourseNoteFile(noteId: string, file: File, signal?: AbortSignal): Promise<NoteFile> {
  const body = new FormData();
  body.append("file", file);
  return formClient<NoteFile>(`/course-notes/${noteId}/files`, body, signal);
}
