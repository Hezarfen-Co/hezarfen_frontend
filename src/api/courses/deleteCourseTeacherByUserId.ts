import { client } from "../client";

export function deleteCourseTeacherByUserId(
  courseId: string,
  userId: string,
): Promise<void> {
  return client<void>(`/courses/${courseId}/teachers/${userId}`, {
    method: "DELETE",
  });
}
