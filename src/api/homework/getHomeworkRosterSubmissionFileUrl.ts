export function getHomeworkRosterSubmissionFileUrl(id: string, userId: string, fileId: string): string {
  return `/api/homework/${encodeURIComponent(id)}/submissions/${encodeURIComponent(userId)}/files/${encodeURIComponent(fileId)}`;
}
