import { blobClient } from "../client";

export function getHomeworkSubmissionFileBlob(id: string, fileId: string, signal?: AbortSignal): Promise<Blob> {
  return blobClient(`/homework/${id}/submission/files/${fileId}`, signal);
}
