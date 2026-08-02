import { client } from "../client";
import type { ClassMember } from "../client";

export type AddMemberBody = { user_id: string };

// Bulk-enrolls the student into every attached course. 400 if the user is not
// a student; 409 on duplicate, ceiling reached, or a target course full.
export function postClassMember(classId: string, body: AddMemberBody): Promise<ClassMember> {
  return client<ClassMember>(`/classes/${classId}/members`, { method: "POST", body });
}
