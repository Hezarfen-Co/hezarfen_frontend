import { client } from "./client";
import type { Subject } from "./types";

export type PostCourseSubjectBody = {
  name: string;
  description?: string | null;
};

export function postCourseSubject(courseId: string, body: PostCourseSubjectBody): Promise<Subject> {
  return client<Subject>(`/courses/${courseId}/subjects`, { method: "POST", body });
}
