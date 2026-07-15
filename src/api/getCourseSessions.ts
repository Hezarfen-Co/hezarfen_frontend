import { client } from "./client";
import type { CourseSession } from "./types";

export function getCourseSessions(courseId: string, signal?: AbortSignal): Promise<CourseSession[]> {
  return client<CourseSession[]>(`/courses/${courseId}/sessions`, { signal });
}
