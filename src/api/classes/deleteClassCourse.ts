import { client } from "../client";

// Detaches the course and sweeps only the rows this class pumped. Needs
// course-manage rights, except when the course row is already gone.
export function deleteClassCourse(classId: string, courseId: string): Promise<void> {
  return client<void>(`/classes/${classId}/courses/${courseId}`, { method: "DELETE" });
}
