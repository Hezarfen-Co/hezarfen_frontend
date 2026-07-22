export function getHomeworkSubmissionFileUrl(id: string, fileId: string): string {
  return `/api/homework/${encodeURIComponent(id)}/submission/files/${encodeURIComponent(fileId)}`;
}
