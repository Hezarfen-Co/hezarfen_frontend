import { client } from "../client";

export function deleteCourseNoteById(id: string): Promise<void> {
  return client<void>(`/course-notes/${id}`, { method: "DELETE" });
}
