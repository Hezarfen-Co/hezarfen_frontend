import { client } from "./client";

export function deleteCourseById(id: string): Promise<void> {
  return client<void>(`/courses/${id}`, { method: "DELETE" });
}
