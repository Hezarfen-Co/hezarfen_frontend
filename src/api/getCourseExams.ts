import { client } from "./client";
import type { Exam } from "./types";

export function getCourseExams(courseId: string, signal?: AbortSignal): Promise<Exam[]> {
  return client<Exam[]>(`/courses/${courseId}/exams`, { signal });
}
