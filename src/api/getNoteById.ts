import { client } from "./client";
import type { Note } from "./types";

export function getNoteById(id: string, signal?: AbortSignal): Promise<Note> {
  return client<Note>(`/notes/${id}`, { signal });
}
