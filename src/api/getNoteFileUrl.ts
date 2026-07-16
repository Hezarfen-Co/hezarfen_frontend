export function getNoteFileUrl(noteId: string, fileId: string): string {
  return `/api/notes/${encodeURIComponent(noteId)}/files/${encodeURIComponent(fileId)}`;
}
