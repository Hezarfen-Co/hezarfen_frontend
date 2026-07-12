import { client } from "./client";
import type { Enrollment } from "./types";

export function getCourseEnrollments(
  courseId: string,
  signal?: AbortSignal,
): Promise<Enrollment[]> {
  return client<Enrollment[]>(`/courses/${courseId}/enrollments`, { signal });
}
