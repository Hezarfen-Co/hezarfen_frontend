import { client } from "./client";

export async function deleteParentStudent(id: string, student_id: string): Promise<void> {
  return client(`/users/${id}/students/${student_id}`, {
    method: "DELETE",
  });
}
