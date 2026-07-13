import { client } from "./client";
import type { Course } from "./types";

export function getMyCourses(signal?: AbortSignal): Promise<Course[]> {
  return client<Course[]>("/courses/me", { signal });
}
