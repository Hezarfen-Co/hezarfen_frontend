import { client } from "./client";
import type { PersonRef } from "./types";

export interface ParentLinkResponse {
  parent: PersonRef;
  student: PersonRef;
  linked_by: PersonRef;
}

export async function postParentStudent(id: string, user_id: string): Promise<ParentLinkResponse> {
  return client(`/users/${id}/students`, {
    method: "POST",
    body: JSON.stringify({ user_id }),
  });
}
