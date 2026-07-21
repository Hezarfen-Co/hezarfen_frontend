import { client } from "../client";
import type { CourseSession } from "../client";

export type PostCourseSessionBody = {
  topic?: string | null;
  teacher_id?: string | null;
  starts_at: number;
  ends_at?: number | null;
};

export function postCourseSession(courseId: string, body: PostCourseSessionBody): Promise<CourseSession> {
  return client<CourseSession>(`/courses/${courseId}/sessions`, { method: "POST", body });
}
