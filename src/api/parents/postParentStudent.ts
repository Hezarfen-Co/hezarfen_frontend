import { client } from "../client";
import type { PersonRef } from "../client";

export interface ParentLinkResponse {
  parent: PersonRef;
  student: PersonRef;
  linked_by: PersonRef;
}

export async function postParentStudent(id: string, user_id: string): Promise<ParentLinkResponse> {
  return client(`/users/${id}/students`, {
    method: "POST",
    body: { user_id },
  });
}
