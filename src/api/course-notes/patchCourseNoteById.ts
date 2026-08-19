import { client } from "../client";
import type { CourseNote } from "../client";

/** Omitted fields keep their value; null never clears here. */
export type PatchCourseNoteBody = {
  title?: string;
  content?: string;
};

export function patchCourseNoteById(id: string, body: PatchCourseNoteBody): Promise<CourseNote> {
  return client<CourseNote>(`/course-notes/${id}`, { method: "PATCH", body });
}
