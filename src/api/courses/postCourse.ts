import { client } from "../client";
import type { Course, CourseKind } from "../client";

/**
 * A catalog row teaches nobody by itself — a şube attaches it
 * (`postClassInstance`), which is what mints the instance students sit in.
 */
export type PostCourseBody = {
  title: string;
  description?: string | null;
  kind?: CourseKind | null;
};

export function postCourse(body: PostCourseBody): Promise<Course> {
  return client<Course>("/courses", { method: "POST", body });
}
