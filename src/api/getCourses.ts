import { client } from "./client";
import type { Course } from "./types";

export function getCourses(signal?: AbortSignal): Promise<Course[]> {
  return client<Course[]>("/courses", { signal });
}
