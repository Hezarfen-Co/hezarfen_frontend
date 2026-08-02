import { client } from "../client";
import type { ClassCourse } from "../client";

export type AttachCourseBody = { course_id: string };

// Bulk-enrolls the whole roster into the course. Needs course-manage rights
// (403 otherwise); 409 on duplicate, ceiling, or a course too small to seat
// the class.
export function postClassCourse(classId: string, body: AttachCourseBody): Promise<ClassCourse> {
  return client<ClassCourse>(`/classes/${classId}/courses`, { method: "POST", body });
}
