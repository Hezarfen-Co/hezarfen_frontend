import { client } from "../client";
import type { CourseNote } from "../client";

export function getCourseNoteById(id: string, signal?: AbortSignal): Promise<CourseNote> {
  return client<CourseNote>(`/course-notes/${id}`, { signal });
}
