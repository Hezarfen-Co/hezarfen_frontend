import { client } from "./client";
import type { Enrollment } from "./types";

export function postCourseEnrollment(
  courseId: string,
  userId: string,
): Promise<Enrollment> {
  return client<Enrollment>(`/courses/${courseId}/enrollments`, {
    method: "POST",
    body: { user_id: userId },
  });
}
