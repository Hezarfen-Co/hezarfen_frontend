import { client } from "../client";

export function deleteCourseEnrollmentByUserId(
  courseId: string,
  userId: string,
): Promise<void> {
  return client<void>(`/courses/${courseId}/enrollments/${userId}`, {
    method: "DELETE",
  });
}
