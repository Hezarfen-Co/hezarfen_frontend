import { client } from "../client";
import type { Subject } from "../client";

// Selects a topic for the section's own set — the set becomes the section's
// own (not the offering's) from this call on.
export function postInstanceSubject(id: string, subjectId: string): Promise<Subject> {
  return client<Subject>(`/instances/${id}/subjects`, { method: "POST", body: { subject: subjectId } });
}
