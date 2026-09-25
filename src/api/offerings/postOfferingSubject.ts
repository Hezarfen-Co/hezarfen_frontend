import { client } from "../client";
import type { Subject } from "../client";

// Manager+. Re-selecting an already selected topic is a no-op success.
export function postOfferingSubject(id: string, subjectId: string): Promise<Subject> {
  return client<Subject>(`/offerings/${id}/subjects`, { method: "POST", body: { subject: subjectId } });
}
