import { client } from "../client";

/** Exam results and badges are untouched — the membership is a door, not a record. */
export function deleteCourseMemberByUserId(courseId: string, userId: string): Promise<void> {
  return client<void>(`/courses/${courseId}/members/${userId}`, { method: "DELETE" });
}
