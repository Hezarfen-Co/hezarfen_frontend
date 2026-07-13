import { client } from "./client";
import type { Course } from "./types";

export type PatchCourseBody = {
  title?: string | null;
  description?: string | null;
};

export function patchCourseById(id: string, body: PatchCourseBody): Promise<Course> {
  return client<Course>(`/courses/${id}`, { method: "PATCH", body });
}
