import { client } from "../client";

// Destroys the school's data and uploaded files for good.
export function deleteSchool(id: string): Promise<void> {
  return client<void>(`/schools/${encodeURIComponent(id)}`, { method: "DELETE" });
}
