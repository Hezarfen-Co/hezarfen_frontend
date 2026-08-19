import { client } from "../client";
import type { CourseNote } from "../client";

export type PostCourseNoteBody = {
  course: string;
  title: string;
  content?: string | null;
};

export function postCourseNote(body: PostCourseNoteBody): Promise<CourseNote> {
  return client<CourseNote>("/course-notes", { method: "POST", body });
}
