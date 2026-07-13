import { client } from "./client";
import type { Note } from "./types";

export type PatchNoteBody = {
  title?: string | null;
  content?: string | null;
};

export function patchNoteById(id: string, body: PatchNoteBody): Promise<Note> {
  return client<Note>(`/notes/${id}`, { method: "PATCH", body });
}
