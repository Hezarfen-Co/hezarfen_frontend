import { client } from "../client";
import type { Homework } from "../client";

export type PostCourseHomeworkBody = {
  title: string;
  description?: string | null;
  subject_id: string;
  due_at: number;
  assigned?: string[] | null;
};

export function postCourseHomework(courseId: string, body: PostCourseHomeworkBody): Promise<Homework> {
  return client<Homework>(`/courses/${courseId}/homework`, { method: "POST", body });
}
