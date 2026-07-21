import { client } from "../client";
import type { Course, CourseKind } from "../client";

export type PostCourseBody = {
  title: string;
  description?: string | null;
  kind?: CourseKind | null;
  term_id?: string | null;
  capacity?: number | null;
};

export function postCourse(body: PostCourseBody): Promise<Course> {
  return client<Course>("/courses", { method: "POST", body });
}
