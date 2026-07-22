import { client } from "../client";
import type { Note } from "../client";

export function getNoteById(id: string, signal?: AbortSignal): Promise<Note> {
  return client<Note>(`/notes/${id}`, { signal });
}
