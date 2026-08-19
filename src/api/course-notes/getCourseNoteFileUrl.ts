export function getCourseNoteFileUrl(noteId: string, fileId: string): string {
  return `/api/course-notes/${encodeURIComponent(noteId)}/files/${encodeURIComponent(fileId)}`;
}
