import { client } from "./client";
import type { Note } from "./types";

/** Omitted fields keep their value; null never clears here. */
export type PatchNoteBody = {
  title?: string;
  content?: string;
};

export function patchNoteById(id: string, body: PatchNoteBody): Promise<Note> {
  return client<Note>(`/notes/${id}`, { method: "PATCH", body });
}
