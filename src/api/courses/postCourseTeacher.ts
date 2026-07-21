import { client } from "../client";
import type { Course } from "../client";

export function postCourseTeacher(
  courseId: string,
  userId: string,
): Promise<Course> {
  return client<Course>(`/courses/${courseId}/teachers`, {
    method: "POST",
    body: { user_id: userId },
  });
}
