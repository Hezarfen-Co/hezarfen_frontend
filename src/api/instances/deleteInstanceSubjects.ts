import { client } from "../client";

// Restores inheritance: drops the section's own topics, the offering's apply.
export function deleteInstanceSubjects(id: string): Promise<void> {
  return client<void>(`/instances/${id}/subjects`, { method: "DELETE" });
}
