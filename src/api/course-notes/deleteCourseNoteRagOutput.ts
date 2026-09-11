import { client } from "../client";

export function deleteCourseNoteRagOutput(noteId: string, outputId: string): Promise<void> {
  return client<void>(`/course-notes/${noteId}/rag/${outputId}`, { method: "DELETE" });
}
