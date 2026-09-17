import { client } from "../client";
import type { Course, CourseKind } from "../client";

/** Omitted fields keep their value. Requires catalog rights: creator or manager+. */
export type PatchCourseBody = {
  title?: string;
  description?: string;
  kind?: CourseKind;
};

export function patchCourseById(id: string, body: PatchCourseBody): Promise<Course> {
  return client<Course>(`/courses/${id}`, { method: "PATCH", body });
}
