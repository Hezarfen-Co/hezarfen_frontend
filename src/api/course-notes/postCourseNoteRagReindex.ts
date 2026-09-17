import { client } from "../client";

/**
 * Re-index a course note now instead of waiting for its next write. 202 —
 * the work is queued, not done by the time this resolves.
 */
export function postCourseNoteRagReindex(noteId: string): Promise<void> {
  return client<void>(`/course-notes/${noteId}/rag/reindex`, { method: "POST" });
}
