import { client } from "./client";
import type { Exam } from "./types";

export type PostCourseExamBody = {
  title: string;
  description?: string | null;
  kind: string;
  weight: number;
  mode?: string | null;
  starts_at?: number | null;
  ends_at?: number | null;
  duration_ms?: number | null;
};

export function postCourseExam(
  courseId: string,
  body: PostCourseExamBody,
): Promise<Exam> {
  return client<Exam>(`/courses/${courseId}/exams`, { method: "POST", body });
}
