import { client } from "../client";

// Destroys the school's data and uploaded files for good.
export function deleteSchoolBySlug(slug: string): Promise<void> {
  return client<void>(`/schools/${encodeURIComponent(slug)}`, { method: "DELETE" });
}
