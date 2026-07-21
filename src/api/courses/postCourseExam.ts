import { client } from "../client";
import type { Exam } from "../client";

export type PostCourseExamBody = {
  title: string;
  description?: string | null;
  kind: string;
  mode?: string | null;
  starts_at?: number | null;
  ends_at?: number | null;
  duration_ms?: number | null;
  max_attempts?: number | null;
  allow_rejoin?: boolean | null;
  draft?: boolean | null;
};

export function postCourseExam(
  courseId: string,
  body: PostCourseExamBody,
): Promise<Exam> {
  return client<Exam>(`/courses/${courseId}/exams`, { method: "POST", body });
}
