import { client } from "../client";
import type { Course } from "../client";

export function getCourseById(id: string, signal?: AbortSignal): Promise<Course> {
  return client<Course>(`/courses/${id}`, { signal });
}
