import { client } from "./client";
import type { Course, CourseKind } from "./types";

/** Omitted fields keep their value. Only `term_id`/`capacity` clear on explicit null. */
export type PatchCourseBody = {
  title?: string;
  description?: string;
  kind?: CourseKind;
  term_id?: string | null;
  capacity?: number | null;
};

export function patchCourseById(id: string, body: PatchCourseBody): Promise<Course> {
  return client<Course>(`/courses/${id}`, { method: "PATCH", body });
}
