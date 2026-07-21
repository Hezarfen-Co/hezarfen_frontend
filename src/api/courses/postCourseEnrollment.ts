import { client } from "../client";
import type { Enrollment } from "../client";

export function postCourseEnrollment(
  courseId: string,
  userId: string,
): Promise<Enrollment> {
  return client<Enrollment>(`/courses/${courseId}/enrollments`, {
    method: "POST",
    body: { user_id: userId },
  });
}
