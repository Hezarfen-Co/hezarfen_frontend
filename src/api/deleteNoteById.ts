import { client } from "./client";

export function deleteNoteById(id: string): Promise<void> {
  return client<void>(`/notes/${id}`, { method: "DELETE" });
}
