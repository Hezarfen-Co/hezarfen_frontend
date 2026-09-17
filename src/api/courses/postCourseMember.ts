import { client } from "../client";
import type { CourseMembership } from "../client";

/**
 * Only students, and only into a `study` (etüt) or `club` (kulüp): a regular
 * ders has no school-wide roster — its students come from the şube.
 */
export function postCourseMember(courseId: string, userId: string): Promise<CourseMembership> {
  return client<CourseMembership>(`/courses/${courseId}/members`, {
    method: "POST",
    body: { user_id: userId },
  });
}
